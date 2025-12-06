import { Component, For, Show, createMemo, createSignal } from 'solid-js';
import {
  notesStore,
  createNote,
  selectNote,
  toggleNoteStarred,
  deleteNote,
  setSearchQuery,
} from '../stores/notesStore';
import { settingsStore } from '../stores/settingsStore';
import { NoteItem } from './NoteItem';
import { SearchInput } from './SearchInput';
import './Sidebar.css';

export const Sidebar: Component = () => {
  const [trashExpanded, setTrashExpanded] = createSignal(false);

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
            <h3 class="section-title">Shortcuts</h3>
            <div class="note-list">
              <For each={starredNotes()}>
                {(note) => (
                  <NoteItem
                    note={note}
                    isSelected={note.id === notesStore.selectedNoteId}
                    onSelect={() => selectNote(note.id)}
                    onToggleStar={() => toggleNoteStarred(note.id)}
                    onDelete={() => deleteNote(note.id)}
                  />
                )}
              </For>
            </div>
          </section>
        </Show>

        <section class="sidebar-section">
          <h3 class="section-title">All Notes</h3>
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
                    onDelete={() => deleteNote(note.id)}
                  />
                )}
              </For>
            </Show>
          </div>
        </section>

        <Show when={trashedNotes().length > 0}>
          <section class="sidebar-section">
            <button
              class="section-title section-title-collapsible"
              onClick={() => setTrashExpanded(!trashExpanded())}
            >
              <span>Trash</span>
              <span class="section-toggle">{trashExpanded() ? '−' : '+'}</span>
            </button>
            <Show when={trashExpanded()}>
              <div class="note-list">
                <For each={trashedNotes()}>
                  {(note) => (
                    <NoteItem
                      note={note}
                      isSelected={note.id === notesStore.selectedNoteId}
                      onSelect={() => selectNote(note.id)}
                      onToggleStar={() => toggleNoteStarred(note.id)}
                      onDelete={() => deleteNote(note.id)}
                      isTrash
                    />
                  )}
                </For>
              </div>
            </Show>
          </section>
        </Show>
      </div>
    </aside>
  );
};
