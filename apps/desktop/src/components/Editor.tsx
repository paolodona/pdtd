import { Component, onMount, onCleanup, createEffect, createSignal, Accessor } from 'solid-js';
import { Editor as TipTapEditor } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import { getEditorExtensions, editorStyles } from '@pdtodo/editor';
import { notesStore, updateNoteTitle } from '../stores/notesStore';
import { invoke } from '@tauri-apps/api/core';
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

export const Editor: Component<EditorProps> = (props) => {
  let editorRef: HTMLDivElement | undefined;
  let titleRef: HTMLInputElement | undefined;
  let ydoc: Y.Doc | undefined;
  let updateHandler: (() => void) | undefined;

  // Use a signal for editor so toolbar can react to it
  const [editor, setEditor] = createSignal<TipTapEditor | undefined>(undefined);

  const [title, setTitle] = createSignal('');
  const [isSaving, setIsSaving] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);

  // Track current note to prevent stale saves
  let currentNoteId: string | null = null;

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

  // Debounce timeout for saving
  let saveTimeout: ReturnType<typeof setTimeout> | undefined;

  // Save content to backend
  const saveContent = async (noteId: string, doc: Y.Doc) => {
    if (!noteId || noteId !== currentNoteId) return;

    setIsSaving(true);
    try {
      const content = Y.encodeStateAsUpdate(doc);
      await invoke('update_note_content', {
        noteId,
        content: Array.from(content),
      });
    } catch (error) {
      console.error('Failed to save note content:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle content change with debouncing
  const handleContentChange = (noteId: string, doc: Y.Doc) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      saveContent(noteId, doc);
    }, 1000);
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
      },
    });

    setEditor(newEditor);
  };

  // Load note content and initialize editor when noteId changes
  createEffect(async () => {
    const noteId = props.noteId;
    if (!noteId || !editorRef) return;

    // Save pending changes from previous note immediately before switching
    const previousNoteId = currentNoteId;
    const previousDoc = ydoc;
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = undefined;
    }
    if (previousNoteId && previousDoc) {
      // Save synchronously before proceeding
      try {
        const content = Y.encodeStateAsUpdate(previousDoc);
        await invoke('update_note_content', {
          noteId: previousNoteId,
          content: Array.from(content),
        });
      } catch (error) {
        console.error('Failed to save previous note:', error);
      }
    }

    // Update tracking
    currentNoteId = noteId;
    setIsLoading(true);

    // Remove previous update handler
    if (previousDoc && updateHandler) {
      previousDoc.off('update', updateHandler);
    }

    try {
      // Fetch note with content from backend
      const note = await invoke<Note>('get_note', { noteId });

      // Only proceed if this is still the current note
      if (noteId !== currentNoteId) return;

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

      // Set up update handler for auto-save
      updateHandler = () => {
        handleContentChange(noteId, ydoc!);
      };
      ydoc.on('update', updateHandler);

    } catch (error) {
      console.error('Failed to load note:', error);
      // Initialize with empty document on error
      ydoc = new Y.Doc();
      initializeEditor(ydoc);
    } finally {
      setIsLoading(false);
    }
  });

  // Update title when note changes
  createEffect(() => {
    const note = notesStore.notes.find((n) => n.id === props.noteId);
    if (note) {
      setTitle(note.title);
    }
  });

  // Handle title change
  let titleTimeout: ReturnType<typeof setTimeout> | undefined;
  const handleTitleChange = (e: InputEvent) => {
    const newTitle = (e.target as HTMLInputElement).value;
    setTitle(newTitle);

    if (titleTimeout) {
      clearTimeout(titleTimeout);
    }
    titleTimeout = setTimeout(() => {
      updateNoteTitle(props.noteId, newTitle);
    }, 500);
  };

  // Handle title key down (Enter moves to editor)
  const handleTitleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editor()?.commands.focus('start');
    }
  };

  // Cleanup - save content before destroying
  onCleanup(async () => {
    // Cancel pending saves and save immediately
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    if (currentNoteId && ydoc) {
      try {
        const content = Y.encodeStateAsUpdate(ydoc);
        await invoke('update_note_content', {
          noteId: currentNoteId,
          content: Array.from(content),
        });
      } catch (error) {
        console.error('Failed to save note on cleanup:', error);
      }
    }

    const currentEditor = editor();
    if (currentEditor) {
      currentEditor.destroy();
    }
    if (ydoc && updateHandler) {
      ydoc.off('update', updateHandler);
    }
    if (titleTimeout) {
      clearTimeout(titleTimeout);
    }
  });

  return (
    <div class="editor">
      <div class="editor-header">
        <input
          ref={titleRef}
          type="text"
          class="editor-title"
          value={title()}
          onInput={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          placeholder="Note title"
        />
        <div class="editor-status">
          {isLoading() && <span class="loading-indicator">Loading...</span>}
          {isSaving() && <span class="saving-indicator">Saving...</span>}
        </div>
      </div>
      <div class="editor-body">
        <div ref={editorRef} class="editor-container" />
      </div>
      <EditorToolbar editor={editor} />
    </div>
  );
};

interface EditorToolbarProps {
  editor: Accessor<TipTapEditor | undefined>;
}

const EditorToolbar: Component<EditorToolbarProps> = (props) => {
  const getEditor = () => props.editor();

  const isActive = (name: string, attrs?: Record<string, unknown>) => {
    return getEditor()?.isActive(name, attrs) ?? false;
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
    </div>
  );
};
