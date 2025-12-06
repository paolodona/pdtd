import { Component, onMount, onCleanup, createEffect, createSignal, createMemo, Accessor, on, Show } from 'solid-js';
import { Editor as TipTapEditor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import Collaboration from '@tiptap/extension-collaboration';
import { getEditorExtensions, editorStyles } from '@pdtodo/editor';
import { notesStore, updateNoteTitle, flushPendingTitleUpdate, updateNoteTimestamp, isScratchPad, SCRATCH_PAD_ID } from '../stores/notesStore';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import * as Y from 'yjs';
import type { Note } from '@pdtodo/types';
import './Editor.css';

// Import extension types to augment ChainedCommands
import '@tiptap/extension-bold';
import '@tiptap/extension-underline';
import '@tiptap/extension-heading';
import '@tiptap/extension-bullet-list';
import '@tiptap/extension-ordered-list';
import '@tiptap/extension-task-list';

interface EditorProps {
  noteId: string;
}

/**
 * Get ordinal suffix for a day number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Format a timestamp as "25th of January 2026 at 14:32"
 */
function formatLastUpdated(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${day}${suffix} of ${month} ${year} at ${hour12}:${minutes} ${ampm}`;
}

// Track pending content saves globally for flush mechanism
let pendingContentSave: {
  noteId: string;
  doc: Y.Doc;
  timeout: ReturnType<typeof setTimeout>;
} | null = null;

/**
 * Flush any pending content save immediately
 */
async function flushPendingContentSave(): Promise<void> {
  if (pendingContentSave) {
    clearTimeout(pendingContentSave.timeout);
    const { noteId, doc } = pendingContentSave;
    pendingContentSave = null;
    try {
      const content = Y.encodeStateAsUpdate(doc);
      await invoke('update_note_content', {
        noteId,
        content: Array.from(content),
      });
      // Update the timestamp in the store after successful save
      updateNoteTimestamp(noteId);
    } catch (error) {
      console.error('Failed to flush content save:', error);
    }
  }
}

export const Editor: Component<EditorProps> = (props) => {
  let editorRef: HTMLDivElement | undefined;
  let ydoc: Y.Doc | undefined;
  let updateHandler: (() => void) | undefined;
  let tooltipHideTimeout: ReturnType<typeof setTimeout> | undefined;

  const [editor, setEditor] = createSignal<TipTapEditor | undefined>(undefined);
  const [title, setTitle] = createSignal('');
  const [isSaving, setIsSaving] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  // Signal to trigger toolbar re-renders when editor state changes (selection, formatting)
  const [editorStateVersion, setEditorStateVersion] = createSignal(0);

  // Link tooltip state
  const [linkTooltip, setLinkTooltip] = createSignal<{
    visible: boolean;
    url: string;
    x: number;
    y: number;
  }>({ visible: false, url: '', x: 0, y: 0 });

  // Helper to schedule tooltip hide with delay
  const scheduleTooltipHide = () => {
    if (tooltipHideTimeout) clearTimeout(tooltipHideTimeout);
    tooltipHideTimeout = setTimeout(() => {
      setLinkTooltip((prev) => ({ ...prev, visible: false }));
    }, 150); // Small delay to allow moving to tooltip
  };

  // Helper to cancel scheduled hide
  const cancelTooltipHide = () => {
    if (tooltipHideTimeout) {
      clearTimeout(tooltipHideTimeout);
      tooltipHideTimeout = undefined;
    }
  };

  // Get the last updated timestamp from the note
  const lastUpdated = createMemo(() => {
    const note = notesStore.notes.find((n) => n.id === props.noteId);
    return note ? formatLastUpdated(note.updatedAt) : '';
  });

  // Inject editor styles
  onMount(() => {
    const styleId = 'pdtodo-editor-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = editorStyles;
      document.head.appendChild(style);
    }
  });

  // Save content to backend with debouncing
  const saveContentDebounced = (noteId: string, doc: Y.Doc) => {
    // Clear any existing pending save
    if (pendingContentSave?.timeout) {
      clearTimeout(pendingContentSave.timeout);
    }

    // Set up new pending save
    pendingContentSave = {
      noteId,
      doc,
      timeout: setTimeout(async () => {
        if (pendingContentSave?.noteId === noteId) {
          pendingContentSave = null;
          setIsSaving(true);
          try {
            const content = Y.encodeStateAsUpdate(doc);
            await invoke('update_note_content', {
              noteId,
              content: Array.from(content),
            });
            // Update the timestamp in the store after successful save
            updateNoteTimestamp(noteId);
          } catch (error) {
            console.error('Failed to save note content:', error);
          } finally {
            setIsSaving(false);
          }
        }
      }, 1000),
    };
  };

  // Create and initialize editor with Yjs document
  const initializeEditor = (doc: Y.Doc) => {
    if (!editorRef) return;

    // Destroy existing editor if any
    const currentEditor = editor();
    if (currentEditor) {
      currentEditor.destroy();
    }

    // Remove History extension from base extensions (Yjs handles undo/redo)
    const baseExtensions = getEditorExtensions({ placeholder: 'Start writing...' })
      .filter((ext: { name: string }) => ext.name !== 'history');

    const newEditor = new TipTapEditor({
      element: editorRef,
      extensions: [
        ...baseExtensions,
        Collaboration.configure({
          document: doc,
          field: 'content',
        }),
      ],
      editorProps: {
        attributes: {
          class: 'editor-content',
        },
        handleClick: (_view, _pos, event) => {
          // Handle link clicks - open in external browser
          const target = event.target as HTMLElement;
          const link = target.closest('a');
          if (link && link.href) {
            event.preventDefault();
            open(link.href).catch(console.error);
            return true;
          }
          return false;
        },
      },
      // Update toolbar state when selection or content changes
      onSelectionUpdate: () => {
        setEditorStateVersion((v) => v + 1);
      },
      onTransaction: () => {
        setEditorStateVersion((v) => v + 1);
      },
    });

    setEditor(newEditor);
  };

  // Load and initialize editor for a note
  const loadNote = async (noteId: string) => {
    setIsLoading(true);

    try {
      const note = await invoke<Note>('get_note', { noteId });

      // Create new Yjs document
      ydoc = new Y.Doc();

      // Apply stored content if any
      if (note.content && note.content.length > 0) {
        const contentArray = note.content instanceof Uint8Array
          ? note.content
          : new Uint8Array(note.content as number[]);
        Y.applyUpdate(ydoc, contentArray);
      }

      // Initialize editor with the Yjs document
      initializeEditor(ydoc);

      // Set up auto-save on document changes
      const docRef = ydoc;
      updateHandler = () => saveContentDebounced(noteId, docRef);
      ydoc.on('update', updateHandler);
    } catch (error) {
      console.error('Failed to load note:', error);
      ydoc = new Y.Doc();
      initializeEditor(ydoc);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle note switching
  createEffect(on(
    () => props.noteId,
    async (noteId) => {
      if (!noteId || !editorRef) return;

      // Flush pending saves before switching
      await flushPendingTitleUpdate();
      await flushPendingContentSave();

      // Clean up previous note's handler
      if (ydoc && updateHandler) {
        ydoc.off('update', updateHandler);
        updateHandler = undefined;
      }

      await loadNote(noteId);
    }
  ));

  // Update title when note changes
  createEffect(() => {
    const note = notesStore.notes.find((n) => n.id === props.noteId);
    if (note) {
      setTitle(note.title);
    }
  });

  // Handle title change - updateNoteTitle already handles debouncing
  const handleTitleChange = (e: InputEvent) => {
    const newTitle = (e.target as HTMLInputElement).value;
    setTitle(newTitle);
    updateNoteTitle(props.noteId, newTitle);
  };

  // Handle title key down (Enter moves to editor)
  const handleTitleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editor()?.commands.focus('start');
    }
  };

  // Handle mouse move over editor to detect link hover
  const handleEditorMouseMove = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');

    if (link && link.href) {
      // Cancel any pending hide when hovering a link
      cancelTooltipHide();

      // Position tooltip above the link
      const rect = link.getBoundingClientRect();

      // Calculate position relative to viewport
      const x = rect.left;
      const y = rect.top - 8; // Position above the link with small gap

      setLinkTooltip({
        visible: true,
        url: link.href,
        x,
        y,
      });
    } else {
      // Schedule hide with delay when not hovering a link
      scheduleTooltipHide();
    }
  };

  // Handle mouse leave from editor
  const handleEditorMouseLeave = () => {
    // Schedule hide with delay to allow moving to tooltip
    scheduleTooltipHide();
  };

  // Handle mouse enter on tooltip (cancel hide)
  const handleTooltipMouseEnter = () => {
    cancelTooltipHide();
  };

  // Handle mouse leave from tooltip
  const handleTooltipMouseLeave = () => {
    setLinkTooltip((prev) => ({ ...prev, visible: false }));
  };

  // Open link from tooltip
  const handleTooltipLinkClick = () => {
    const { url } = linkTooltip();
    if (url) {
      open(url).catch(console.error);
      setLinkTooltip((prev) => ({ ...prev, visible: false }));
    }
  };

  // Cleanup - save content before destroying
  onCleanup(async () => {
    // Clear tooltip timeout
    cancelTooltipHide();

    // Flush any pending saves
    await flushPendingTitleUpdate();
    await flushPendingContentSave();

    const currentEditor = editor();
    if (currentEditor) {
      currentEditor.destroy();
    }
    if (ydoc && updateHandler) {
      ydoc.off('update', updateHandler);
    }
  });

  return (
    <div class="editor">
      <div class="editor-header">
        <EditorToolbar editor={editor} editorStateVersion={editorStateVersion} />
        <div class="editor-header-row">
          <div class="editor-title-container">
            <input
              type="text"
              class="editor-title"
              value={title()}
              onInput={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder="Note title"
              readOnly={isScratchPad(props.noteId)}
            />
            <span class="editor-timestamp">Last updated: {lastUpdated()}</span>
          </div>
          <div class="editor-status">
            {isLoading() && <span class="loading-indicator">Loading...</span>}
            {isSaving() && <span class="saving-indicator">Saving...</span>}
          </div>
        </div>
      </div>
      <div
        class="editor-body"
        onMouseMove={handleEditorMouseMove}
        onMouseLeave={handleEditorMouseLeave}
      >
        <div ref={editorRef} class="editor-content-wrapper" />
      </div>

      {/* Link tooltip */}
      <Show when={linkTooltip().visible}>
        <div
          class="link-tooltip"
          style={{
            position: 'fixed',
            left: `${linkTooltip().x}px`,
            top: `${linkTooltip().y}px`,
            transform: 'translateY(-100%)',
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <button
            class="link-tooltip-btn"
            onClick={handleTooltipLinkClick}
            title="Open link"
          >
            <svg
              class="link-tooltip-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span class="link-tooltip-url">{linkTooltip().url}</span>
          </button>
        </div>
      </Show>
    </div>
  );
};

interface EditorToolbarProps {
  editor: Accessor<TipTapEditor | undefined>;
  editorStateVersion: Accessor<number>;
}

const EditorToolbar: Component<EditorToolbarProps> = (props) => {
  const getEditor = () => props.editor();

  // isActive depends on editorStateVersion to make it reactive
  // When editorStateVersion changes, Solid re-evaluates classList bindings
  const isActive = (name: string, attrs?: Record<string, unknown>) => {
    // Read the signal to create a reactive dependency
    props.editorStateVersion();
    return getEditor()?.isActive(name, attrs) ?? false;
  };

  // Check if there are any checked task items in the document
  const hasCheckedItems = () => {
    // Read the signal to create a reactive dependency
    props.editorStateVersion();
    const ed = getEditor();
    if (!ed) return false;

    let hasChecked = false;
    ed.state.doc.descendants((node) => {
      if (node.type.name === 'taskItem' && node.attrs.checked === true) {
        hasChecked = true;
        return false; // Stop iteration
      }
      return true;
    });
    return hasChecked;
  };

  // Remove all checked task items from the document
  // Handles nested items: promotes unchecked children before deleting checked parents
  const clearDoneItems = () => {
    const ed = getEditor();
    if (!ed) return;

    const { state } = ed.view;
    let tr = state.tr;

    // Structure to hold info about checked items with their depth for sorting
    interface CheckedItemInfo {
      pos: number;
      nodeSize: number;
      depth: number;
      uncheckedChildNodes: ProseMirrorNode[];
    }

    const checkedItems: CheckedItemInfo[] = [];

    // First pass: collect all checked items and their unchecked nested children
    // Also track depth for proper ordering (process deepest first)
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'taskItem' && node.attrs.checked === true) {
        const uncheckedChildNodes: ProseMirrorNode[] = [];

        // Look for nested taskList within this taskItem
        node.forEach((child) => {
          if (child.type.name === 'taskList') {
            // Collect unchecked children from the nested list
            child.forEach((grandchild) => {
              if (grandchild.type.name === 'taskItem' && grandchild.attrs.checked !== true) {
                uncheckedChildNodes.push(grandchild);
              }
            });
          }
        });

        // Calculate depth by resolving position
        const $pos = state.doc.resolve(pos);
        const depth = $pos.depth;

        checkedItems.push({
          pos,
          nodeSize: node.nodeSize,
          depth,
          uncheckedChildNodes,
        });
      }
      return true;
    });

    // Sort by depth (deepest first), then by position (end first)
    // This ensures we process nested items before their parents
    checkedItems.sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth;
      return b.pos - a.pos;
    });

    // Track which positions have been processed to avoid double-processing
    const processedRanges: { from: number; to: number }[] = [];

    for (const item of checkedItems) {
      // Skip if this item was already deleted as part of a parent
      const originalFrom = item.pos;
      const originalTo = item.pos + item.nodeSize;
      const alreadyProcessed = processedRanges.some(
        (range) => originalFrom >= range.from && originalTo <= range.to
      );
      if (alreadyProcessed) continue;

      // Map position through any previous changes
      const mappedPos = tr.mapping.map(item.pos);
      const mappedEnd = tr.mapping.map(item.pos + item.nodeSize);

      if (item.uncheckedChildNodes.length > 0) {
        // We need to insert unchecked children as siblings after this item
        const $pos = tr.doc.resolve(mappedPos);

        // Find the taskList parent (should be immediate parent of taskItem)
        let taskListDepth = -1;
        for (let d = $pos.depth; d >= 0; d--) {
          if ($pos.node(d).type.name === 'taskList') {
            taskListDepth = d;
            break;
          }
        }

        if (taskListDepth >= 0) {
          // Insert unchecked children after the current taskItem position
          const insertPos = mappedEnd;

          // Insert each child as a sibling
          let insertOffset = 0;
          for (const childNode of item.uncheckedChildNodes) {
            tr = tr.insert(insertPos + insertOffset, childNode);
            insertOffset += childNode.nodeSize;
          }
        }
      }

      // Delete the checked item using deleteRange for more reliable deletion
      const deleteFrom = tr.mapping.map(item.pos);
      const deleteTo = tr.mapping.map(item.pos + item.nodeSize);

      // Use replaceWith to replace the node with nothing (more reliable than delete)
      tr = tr.replaceWith(deleteFrom, deleteTo, []);

      // Track this range as processed
      processedRanges.push({ from: originalFrom, to: originalTo });
    }

    // Clean up empty or effectively empty taskLists
    // Run multiple passes until no more changes
    let cleanupNeeded = true;
    while (cleanupNeeded) {
      cleanupNeeded = false;
      const listsToRemove: { from: number; to: number }[] = [];

      tr.doc.descendants((node, pos) => {
        if (node.type.name === 'taskList') {
          // Check if the list is empty or only contains empty task items
          let hasContent = false;
          node.forEach((child) => {
            if (child.type.name === 'taskItem') {
              // Check if this taskItem has any real content
              let itemHasContent = false;
              child.forEach((grandchild) => {
                if (grandchild.type.name === 'paragraph') {
                  // Check if paragraph has text content
                  if (grandchild.textContent.trim().length > 0) {
                    itemHasContent = true;
                  }
                } else if (grandchild.type.name === 'taskList') {
                  // Has nested list, consider it as having content
                  itemHasContent = true;
                }
              });
              if (itemHasContent) {
                hasContent = true;
              }
            }
          });

          if (!hasContent) {
            listsToRemove.push({ from: pos, to: pos + node.nodeSize });
            cleanupNeeded = true;
          }
        }
        return true;
      });

      // Delete empty lists in reverse order
      listsToRemove.reverse().forEach(({ from, to }) => {
        tr = tr.replaceWith(from, to, []);
      });
    }

    if (tr.docChanged) {
      ed.view.dispatch(tr);
      ed.commands.focus();
    }
  };

  const runCommand = (command: (ed: TipTapEditor) => boolean) => {
    const ed = getEditor();
    if (ed) {
      command(ed);
      ed.commands.focus();
    }
  };

  return (
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          classList={{ 'is-active': isActive('bold') }}
          onClick={() => runCommand((ed) => ed.chain().toggleBold().run())}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          class="toolbar-btn"
          classList={{ 'is-active': isActive('underline') }}
          onClick={() => runCommand((ed) => ed.chain().toggleUnderline().run())}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          classList={{ 'is-active': isActive('heading', { level: 1 }) }}
          onClick={() => runCommand((ed) => ed.chain().toggleHeading({ level: 1 }).run())}
          title="Heading 1 (Ctrl+1)"
        >
          H1
        </button>
        <button
          class="toolbar-btn"
          classList={{ 'is-active': isActive('heading', { level: 2 }) }}
          onClick={() => runCommand((ed) => ed.chain().toggleHeading({ level: 2 }).run())}
          title="Heading 2 (Ctrl+2)"
        >
          H2
        </button>
        <button
          class="toolbar-btn"
          classList={{ 'is-active': isActive('heading', { level: 3 }) }}
          onClick={() => runCommand((ed) => ed.chain().toggleHeading({ level: 3 }).run())}
          title="Heading 3 (Ctrl+3)"
        >
          H3
        </button>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          classList={{ 'is-active': isActive('bulletList') }}
          onClick={() => runCommand((ed) => ed.chain().toggleBulletList().run())}
          title="Bullet List (Ctrl+Shift+8)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
            />
          </svg>
        </button>
        <button
          class="toolbar-btn"
          classList={{ 'is-active': isActive('orderedList') }}
          onClick={() => runCommand((ed) => ed.chain().toggleOrderedList().run())}
          title="Numbered List (Ctrl+Shift+7)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 6h11M10 12h11M10 18h11M3 5l2 1v5M3 11h3M3 17v1a1 1 0 001 1h1a1 1 0 001-1v-1a1 1 0 00-1-1H4"
            />
          </svg>
        </button>
        <button
          class="toolbar-btn"
          classList={{ 'is-active': isActive('taskList') }}
          onClick={() => runCommand((ed) => ed.chain().toggleTaskList().run())}
          title="Task List (Ctrl+Shift+9)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </button>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          onClick={() => runCommand((ed) => ed.chain().sinkListItem('listItem').run() || ed.chain().sinkListItem('taskItem').run())}
          title="Indent (Tab)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 5l7 7-7 7M5 5v14"
            />
          </svg>
        </button>
        <button
          class="toolbar-btn"
          onClick={() => runCommand((ed) => ed.chain().liftListItem('listItem').run() || ed.chain().liftListItem('taskItem').run())}
          title="Outdent (Shift+Tab)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 19l-7-7 7-7M19 5v14"
            />
          </svg>
        </button>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          classList={{ 'is-active': isActive('link') }}
          onClick={() => {
            const ed = getEditor();
            if (!ed) return;

            if (ed.isActive('link')) {
              // Remove link
              ed.chain().unsetLink().run();
            } else {
              // Prompt for URL
              const url = window.prompt('Enter URL:');
              if (url) {
                ed.chain().setLink({ href: url }).run();
              }
            }
            ed.commands.focus();
          }}
          title="Add/Edit Link (Ctrl+K)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        </button>
      </div>

      {/* Spacer pushes clear done button to the right */}
      <div class="toolbar-spacer" />

      {/* Clear done button - only visible when there are checked items */}
      <Show when={hasCheckedItems()}>
        <button
          class="clear-done-btn"
          onClick={clearDoneItems}
          title="Remove all completed tasks"
        >
          clear done
        </button>
      </Show>
    </div>
  );
};
