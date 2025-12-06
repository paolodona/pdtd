import { Component, For, Show, createMemo } from 'solid-js';
import {
  notesStore,
  createNote,
  selectNote,
  toggleNoteStarred,
  deleteNote,
  setSearchQuery,
  SCRATCH_PAD_ID,
} from '../stores/notesStore';
import {
  settingsStore,
  setAllNotesExpanded,
  setTrashExpanded,
} from '../stores/settingsStore';
import { focusEditorStart } from '../stores/focusStore';
import { NoteItem } from './NoteItem';
import { SearchInput } from './SearchInput';
import './Sidebar.css';

export const Sidebar: Component = () => {
  const searchQuery = () => notesStore.searchQuery;

  const scratchPad = createMemo(() => notesStore.scratchPad);

  // Filter starred notes by search query
  const starredNotes = createMemo(() => {
    const query = searchQuery().toLowerCase();
    const starred = notesStore.starredNotes;
    if (!query) return starred;
    return starred.filter((n) => n.title.toLowerCase().includes(query));
  });

  // Get non-starred active notes, filtered by search query
  const activeNotes = createMemo(() => {
    const query = searchQuery().toLowerCase();
    // Exclude starred notes from "All Notes" section
    const nonStarred = notesStore.activeNotes.filter((n) => !n.starred);
    const filtered = query
      ? nonStarred.filter((n) => n.title.toLowerCase().includes(query))
      : nonStarred;
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  });

  // Combined matching notes for Enter key handling
  const allMatchingNotes = createMemo(() => {
    return [...starredNotes(), ...activeNotes()];
  });

  const trashedNotes = createMemo(() => notesStore.trashedNotes);

  const handleNewNote = async () => {
    await createNote();
  };

  // Handle Enter in search: if exactly one match, select it and focus editor
  const handleSearchEnter = () => {
    const matches = allMatchingNotes();
    if (matches.length === 1) {
      const note = matches[0];
      selectNote(note.id);
      setSearchQuery('');
      // Small delay to allow the editor to load the new note
      setTimeout(() => {
        focusEditorStart();
      }, 100);
    }
  };

  return (
    <aside class="sidebar" style={{ width: `${settingsStore.sidebarWidth}px` }}>
      <div class="sidebar-header">
        <SearchInput
          value={notesStore.searchQuery}
          onInput={(value) => setSearchQuery(value)}
          placeholder="Search notes..."
          onEnter={handleSearchEnter}
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
        <Show when={scratchPad()}>
          <section class="sidebar-section">
            <div class="note-list">
              <div
                class="scratch-pad-item"
                classList={{ 'is-selected': scratchPad()!.id === notesStore.selectedNoteId }}
                onClick={() => selectNote(SCRATCH_PAD_ID)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="scratch-pad-icon">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span class="scratch-pad-title">Scratch Pad</span>
              </div>
            </div>
          </section>
        </Show>

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
                    searchQuery={searchQuery()}
                  />
                )}
              </For>
            </div>
          </section>
        </Show>

        <section class="sidebar-section">
          <button
            class="section-title section-title-collapsible"
            onClick={() => setAllNotesExpanded(!settingsStore.allNotesExpanded)}
          >
            <span>All Notes</span>
            <span class="section-toggle">{settingsStore.allNotesExpanded ? '−' : '+'}</span>
          </button>
          <Show when={settingsStore.allNotesExpanded}>
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
                      searchQuery={searchQuery()}
                    />
                  )}
                </For>
              </Show>
            </div>
          </Show>
        </section>

        <Show when={trashedNotes().length > 0}>
          <section class="sidebar-section">
            <button
              class="section-title section-title-collapsible"
              onClick={() => setTrashExpanded(!settingsStore.trashExpanded)}
            >
              <span>Trash</span>
              <span class="section-toggle">{settingsStore.trashExpanded ? '−' : '+'}</span>
            </button>
            <Show when={settingsStore.trashExpanded}>
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
