import { Component, For, Show, createMemo } from 'solid-js';
import {
  notesStore,
  createNote,
  selectNote,
  toggleNoteStarred,
  setSearchQuery,
} from '../stores/notesStore';
import { settingsStore } from '../stores/settingsStore';
import { NoteItem } from './NoteItem';
import { SearchInput } from './SearchInput';
import './Sidebar.css';

export const Sidebar: Component = () => {
  const starredNotes = createMemo(() => notesStore.starredNotes);
  const activeNotes = createMemo(() =>
    notesStore.filteredNotes.sort((a, b) => b.updatedAt - a.updatedAt)
  );
  const trashedNotes = createMemo(() => notesStore.trashedNotes);

  const handleNewNote = async () => {
    await createNote();
  };

  return (
    <aside class="sidebar" style={{ width: `${settingsStore.sidebarWidth}px` }}>
      <div class="sidebar-header">
        <SearchInput
          value={notesStore.searchQuery}
          onInput={(value) => setSearchQuery(value)}
          placeholder="Search notes..."
        />
        <button class="new-note-btn" onClick={handleNewNote} aria-label="New note">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      <div class="sidebar-content">
        <Show when={starredNotes().length > 0}>
          <section class="sidebar-section">
            <h3 class="section-title">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="section-icon"
              >
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Shortcuts
            </h3>
            <div class="note-list">
              <For each={starredNotes()}>
                {(note) => (
                  <NoteItem
                    note={note}
                    isSelected={note.id === notesStore.selectedNoteId}
                    onSelect={() => selectNote(note.id)}
                    onToggleStar={() => toggleNoteStarred(note.id)}
                  />
                )}
              </For>
            </div>
          </section>
        </Show>

        <section class="sidebar-section">
          <h3 class="section-title">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="section-icon"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            All Notes
          </h3>
          <div class="note-list">
            <Show
              when={activeNotes().length > 0}
              fallback={
                <div class="empty-list">
                  <p>No notes yet</p>
                  <button class="create-first-btn" onClick={handleNewNote}>
                    Create your first note
                  </button>
                </div>
              }
            >
              <For each={activeNotes()}>
                {(note) => (
                  <NoteItem
                    note={note}
                    isSelected={note.id === notesStore.selectedNoteId}
                    onSelect={() => selectNote(note.id)}
                    onToggleStar={() => toggleNoteStarred(note.id)}
                  />
                )}
              </For>
            </Show>
          </div>
        </section>

        <Show when={trashedNotes().length > 0}>
          <section class="sidebar-section">
            <h3 class="section-title">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="section-icon"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Trash
            </h3>
            <div class="note-list">
              <For each={trashedNotes()}>
                {(note) => (
                  <NoteItem
                    note={note}
                    isSelected={note.id === notesStore.selectedNoteId}
                    onSelect={() => selectNote(note.id)}
                    onToggleStar={() => toggleNoteStarred(note.id)}
                    isTrash
                  />
                )}
              </For>
            </div>
          </section>
        </Show>
      </div>
    </aside>
  );
};
