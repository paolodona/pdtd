import { Component, onMount, onCleanup, createEffect, createSignal } from 'solid-js';
import { Editor as TipTapEditor } from '@tiptap/core';
import { getEditorExtensions, editorStyles } from '@pdtodo/editor';
import { notesStore, updateNoteTitle } from '../stores/notesStore';
import './Editor.css';

interface EditorProps {
  noteId: string;
}

export const Editor: Component<EditorProps> = (props) => {
  let editorRef: HTMLDivElement | undefined;
  let titleRef: HTMLInputElement | undefined;
  let editor: TipTapEditor | undefined;

  const [title, setTitle] = createSignal('');
  const [isSaving, setIsSaving] = createSignal(false);

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

  // Initialize editor
  onMount(() => {
    if (!editorRef) return;

    editor = new TipTapEditor({
      element: editorRef,
      extensions: getEditorExtensions({ placeholder: 'Start writing...' }),
      content: '<p></p>',
      editorProps: {
        attributes: {
          class: 'editor-content',
        },
      },
      onUpdate: ({ editor }) => {
        // Auto-save on change (debounced)
        handleContentChange();
      },
    });
  });

  // Update title when note changes
  createEffect(() => {
    const note = notesStore.notes.find((n) => n.id === props.noteId);
    if (note) {
      setTitle(note.title);
    }
  });

  // Handle content change with debouncing
  let saveTimeout: ReturnType<typeof setTimeout> | undefined;
  const handleContentChange = () => {
    setIsSaving(true);
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      // Save content here (via Tauri command or sync)
      setIsSaving(false);
    }, 1000);
  };

  // Handle title change
  const handleTitleChange = (e: InputEvent) => {
    const newTitle = (e.target as HTMLInputElement).value;
    setTitle(newTitle);

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      updateNoteTitle(props.noteId, newTitle);
    }, 500);
  };

  // Handle title key down (Enter moves to editor)
  const handleTitleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editor?.commands.focus('start');
    }
  };

  // Cleanup
  onCleanup(() => {
    editor?.destroy();
    if (saveTimeout) {
      clearTimeout(saveTimeout);
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
  editor: TipTapEditor | undefined;
}

const EditorToolbar: Component<EditorToolbarProps> = (props) => {
  const isActive = (name: string, attrs?: Record<string, unknown>) => {
    return props.editor?.isActive(name, attrs) ?? false;
  };

  const runCommand = (command: () => boolean) => {
    command();
    props.editor?.commands.focus();
  };

  return (
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          classList={{ 'is-active': isActive('bold') }}
          onClick={() => runCommand(() => props.editor?.chain().toggleBold().run() ?? false)}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          class="toolbar-btn"
          classList={{ 'is-active': isActive('underline') }}
          onClick={() => runCommand(() => props.editor?.chain().toggleUnderline().run() ?? false)}
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
          onClick={() =>
            runCommand(() => props.editor?.chain().toggleHeading({ level: 1 }).run() ?? false)
          }
          title="Heading 1 (Ctrl+1)"
        >
          H1
        </button>
        <button
          class="toolbar-btn"
          classList={{ 'is-active': isActive('heading', { level: 2 }) }}
          onClick={() =>
            runCommand(() => props.editor?.chain().toggleHeading({ level: 2 }).run() ?? false)
          }
          title="Heading 2 (Ctrl+2)"
        >
          H2
        </button>
        <button
          class="toolbar-btn"
          classList={{ 'is-active': isActive('heading', { level: 3 }) }}
          onClick={() =>
            runCommand(() => props.editor?.chain().toggleHeading({ level: 3 }).run() ?? false)
          }
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
          onClick={() =>
            runCommand(() => props.editor?.chain().toggleBulletList().run() ?? false)
          }
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
          onClick={() =>
            runCommand(() => props.editor?.chain().toggleOrderedList().run() ?? false)
          }
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
          onClick={() => runCommand(() => props.editor?.chain().toggleTaskList().run() ?? false)}
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
