import { Component, createSignal, onMount, onCleanup, Show, For, createEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Editor } from '@tiptap/core';
import { getEditorExtensions, editorStyles } from '@pdtodo/editor';
import { notesStore } from '../stores/notes';
import { authStore } from '../stores/auth';

export const Notes: Component = () => {
  const navigate = useNavigate();
  let editorRef: HTMLDivElement | undefined;
  let editor: Editor | null = null;
  const [searchQuery, setSearchQuery] = createSignal('');
  const [isSaving, setIsSaving] = createSignal(false);

  // Debounce timer for auto-save
  let saveTimer: number | null = null;

  onMount(async () => {
    // Inject editor styles
    const styleEl = document.createElement('style');
    styleEl.textContent = editorStyles;
    document.head.appendChild(styleEl);

    // Fetch notes
    try {
      await notesStore.fetchNotes();
    } catch (e) {
      console.error('Failed to fetch notes:', e);
    }

    return () => {
      document.head.removeChild(styleEl);
    };
  });

  // Initialize/update editor when note changes
  createEffect(() => {
    const note = notesStore.currentNote();

    if (editorRef && note) {
      if (!editor) {
        editor = new Editor({
          element: editorRef,
          extensions: getEditorExtensions({ placeholder: 'Start writing your note...' }),
          content: '',
          onUpdate: ({ editor: e }) => {
            // Debounced auto-save
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = window.setTimeout(async () => {
              const currentNote = notesStore.currentNote();
              if (currentNote) {
                setIsSaving(true);
                try {
                  const content = btoa(JSON.stringify(e.getJSON()));
                  await notesStore.updateNote(currentNote.id, { content });
                } catch (err) {
                  console.error('Auto-save failed:', err);
                } finally {
                  setIsSaving(false);
                }
              }
            }, 1000);
          },
        });
      }

      // Set content from note
      try {
        const decodedContent = note.content ? atob(note.content) : '';
        if (decodedContent) {
          const json = JSON.parse(decodedContent);
          editor.commands.setContent(json);
        } else {
          editor.commands.clearContent();
        }
      } catch {
        // If not JSON, try to set as text
        editor.commands.clearContent();
      }
    }
  });

  onCleanup(() => {
    if (saveTimer) clearTimeout(saveTimer);
    if (editor) {
      editor.destroy();
      editor = null;
    }
  });

  const handleCreateNote = async () => {
    try {
      await notesStore.createNote('Untitled', '');
    } catch (e) {
      console.error('Failed to create note:', e);
    }
  };

  const handleSelectNote = async (id: string) => {
    try {
      await notesStore.selectNote(id);
    } catch (e) {
      console.error('Failed to select note:', e);
    }
  };

  const handleDeleteNote = async (e: Event, id: string) => {
    e.stopPropagation();
    if (confirm('Move this note to trash?')) {
      try {
        await notesStore.deleteNote(id);
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    }
  };

  const handleToggleStar = async (e: Event, id: string) => {
    e.stopPropagation();
    try {
      await notesStore.toggleStar(id);
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  const handleTitleChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const note = notesStore.currentNote();
    if (note) {
      try {
        await notesStore.updateNote(note.id, { title: input.value });
      } catch (err) {
        console.error('Failed to update title:', err);
      }
    }
  };

  const handleLogout = async () => {
    await authStore.logout();
    navigate('/login', { replace: true });
  };

  const filteredNotes = () => {
    const query = searchQuery().toLowerCase();
    if (!query) return notesStore.notes();
    return notesStore.notes().filter((n) => n.title.toLowerCase().includes(query));
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div class="notes-page">
      {/* Sidebar */}
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-title">
            <h2>PDTodo</h2>
            <button class="icon-btn" onClick={handleLogout} title="Sign out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
          <button class="btn-primary new-note-btn" onClick={handleCreateNote}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Note
          </button>
        </div>

        <div class="sidebar-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </div>

        <nav class="sidebar-nav">
          <Show
            when={!notesStore.isLoading()}
            fallback={<div class="loading-notes">Loading notes...</div>}
          >
            <Show
              when={filteredNotes().length > 0}
              fallback={
                <div class="no-notes">
                  {searchQuery() ? 'No matching notes' : 'No notes yet. Create one!'}
                </div>
              }
            >
              <ul class="notes-list">
                <For each={filteredNotes()}>
                  {(note) => (
                    <li
                      class={`note-item ${notesStore.currentNote()?.id === note.id ? 'active' : ''}`}
                      onClick={() => handleSelectNote(note.id)}
                    >
                      <div class="note-item-content">
                        <div class="note-item-title">
                          {note.title || 'Untitled'}
                        </div>
                        <div class="note-item-date">
                          {formatDate(note.updatedAt)}
                        </div>
                      </div>
                      <div class="note-item-actions">
                        <button
                          class={`icon-btn star-btn ${note.starred ? 'starred' : ''}`}
                          onClick={(e) => handleToggleStar(e, note.id)}
                          title={note.starred ? 'Unstar' : 'Star'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={note.starred ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </button>
                        <button
                          class="icon-btn delete-btn"
                          onClick={(e) => handleDeleteNote(e, note.id)}
                          title="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </nav>

        <div class="sidebar-footer">
          <button class="icon-btn" onClick={() => navigate('/settings')} title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main class="main-content">
        <Show
          when={notesStore.currentNote()}
          fallback={
            <div class="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p>Select a note or create a new one</p>
            </div>
          }
        >
          <div class="note-editor">
            <div class="note-header">
              <input
                type="text"
                class="note-title-input"
                value={notesStore.currentNote()?.title || ''}
                onInput={handleTitleChange}
                placeholder="Untitled"
              />
              <div class="note-meta">
                <Show when={isSaving()}>
                  <span class="saving-indicator">Saving...</span>
                </Show>
              </div>
            </div>
            <div class="editor-container" ref={editorRef} />
          </div>
        </Show>
      </main>
    </div>
  );
};
