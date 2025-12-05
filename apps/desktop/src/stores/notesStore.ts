import { createStore, produce } from 'solid-js/store';
import type { NoteMeta } from '@pdtodo/types';
import { invoke } from '@tauri-apps/api/core';

interface NotesState {
  notes: NoteMeta[];
  selectedNoteId: string | null;
  searchQuery: string;
  isLoading: boolean;
}

const [notesState, setNotesState] = createStore<NotesState>({
  notes: [],
  selectedNoteId: null,
  searchQuery: '',
  isLoading: false,
});

// Computed values
export const notesStore = {
  get notes() {
    return notesState.notes;
  },
  get selectedNoteId() {
    return notesState.selectedNoteId;
  },
  get selectedNote() {
    return notesState.notes.find((n) => n.id === notesState.selectedNoteId) ?? null;
  },
  get searchQuery() {
    return notesState.searchQuery;
  },
  get isLoading() {
    return notesState.isLoading;
  },
  get starredNotes() {
    return notesState.notes.filter((n) => n.starred && !n.deletedAt);
  },
  get activeNotes() {
    return notesState.notes.filter((n) => !n.deletedAt);
  },
  get trashedNotes() {
    return notesState.notes.filter((n) => n.deletedAt !== null);
  },
  get filteredNotes() {
    const query = notesState.searchQuery.toLowerCase();
    if (!query) return notesState.notes.filter((n) => !n.deletedAt);
    return notesState.notes.filter(
      (n) => !n.deletedAt && n.title.toLowerCase().includes(query)
    );
  },
};

/**
 * Load all notes from the backend
 */
export async function loadNotes(): Promise<void> {
  setNotesState('isLoading', true);
  try {
    const notes = await invoke<NoteMeta[]>('get_notes');
    setNotesState('notes', notes);

    // Select the first note if none is selected
    if (!notesState.selectedNoteId && notes.length > 0) {
      const firstActive = notes.find((n) => !n.deletedAt);
      if (firstActive) {
        setNotesState('selectedNoteId', firstActive.id);
      }
    }
  } catch (error) {
    console.error('Failed to load notes:', error);
    // For development without Tauri, use mock data
    setNotesState('notes', getMockNotes());
    if (!notesState.selectedNoteId) {
      setNotesState('selectedNoteId', getMockNotes()[0]?.id ?? null);
    }
  } finally {
    setNotesState('isLoading', false);
  }
}

/**
 * Create a new note
 */
export async function createNote(): Promise<string | null> {
  try {
    const noteId = await invoke<string>('create_note', { title: 'Untitled' });
    await loadNotes();
    setNotesState('selectedNoteId', noteId);
    return noteId;
  } catch (error) {
    console.error('Failed to create note:', error);
    // Mock for development
    const newNote: NoteMeta = {
      id: `note-${Date.now()}`,
      title: 'Untitled',
      starred: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
    };
    setNotesState(
      produce((state) => {
        state.notes.unshift(newNote);
        state.selectedNoteId = newNote.id;
      })
    );
    return newNote.id;
  }
}

/**
 * Select a note
 */
export function selectNote(noteId: string): void {
  setNotesState('selectedNoteId', noteId);
}

/**
 * Update note title
 */
export async function updateNoteTitle(noteId: string, title: string): Promise<void> {
  setNotesState(
    produce((state) => {
      const note = state.notes.find((n) => n.id === noteId);
      if (note) {
        note.title = title;
        note.updatedAt = Date.now();
      }
    })
  );

  try {
    await invoke('update_note_title', { noteId, title });
  } catch (error) {
    console.error('Failed to update note title:', error);
  }
}

/**
 * Toggle note starred status
 */
export async function toggleNoteStarred(noteId: string): Promise<void> {
  const note = notesState.notes.find((n) => n.id === noteId);
  if (!note) return;

  const newStarred = !note.starred;
  setNotesState(
    produce((state) => {
      const n = state.notes.find((n) => n.id === noteId);
      if (n) {
        n.starred = newStarred;
        n.updatedAt = Date.now();
      }
    })
  );

  try {
    await invoke('update_note_starred', { noteId, starred: newStarred });
  } catch (error) {
    console.error('Failed to update note starred status:', error);
  }
}

/**
 * Move note to trash
 */
export async function deleteNote(noteId: string): Promise<void> {
  setNotesState(
    produce((state) => {
      const note = state.notes.find((n) => n.id === noteId);
      if (note) {
        note.deletedAt = Date.now();
      }
      // Select another note if the deleted one was selected
      if (state.selectedNoteId === noteId) {
        const nextNote = state.notes.find((n) => n.id !== noteId && !n.deletedAt);
        state.selectedNoteId = nextNote?.id ?? null;
      }
    })
  );

  try {
    await invoke('delete_note', { noteId });
  } catch (error) {
    console.error('Failed to delete note:', error);
  }
}

/**
 * Restore note from trash
 */
export async function restoreNote(noteId: string): Promise<void> {
  setNotesState(
    produce((state) => {
      const note = state.notes.find((n) => n.id === noteId);
      if (note) {
        note.deletedAt = null;
      }
    })
  );

  try {
    await invoke('restore_note', { noteId });
  } catch (error) {
    console.error('Failed to restore note:', error);
  }
}

/**
 * Permanently delete a note
 */
export async function permanentlyDeleteNote(noteId: string): Promise<void> {
  setNotesState(
    produce((state) => {
      state.notes = state.notes.filter((n) => n.id !== noteId);
      if (state.selectedNoteId === noteId) {
        state.selectedNoteId = null;
      }
    })
  );

  try {
    await invoke('permanently_delete_note', { noteId });
  } catch (error) {
    console.error('Failed to permanently delete note:', error);
  }
}

/**
 * Set search query
 */
export function setSearchQuery(query: string): void {
  setNotesState('searchQuery', query);
}

/**
 * Duplicate a note
 */
export async function duplicateNote(noteId: string): Promise<string | null> {
  try {
    const newNoteId = await invoke<string>('duplicate_note', { noteId });
    await loadNotes();
    setNotesState('selectedNoteId', newNoteId);
    return newNoteId;
  } catch (error) {
    console.error('Failed to duplicate note:', error);
    return null;
  }
}

// Mock data for development without Tauri
function getMockNotes(): NoteMeta[] {
  return [
    {
      id: 'note-1',
      title: 'Meeting Notes - Project Alpha',
      starred: true,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 3600000,
      deletedAt: null,
    },
    {
      id: 'note-2',
      title: 'Daily Tasks',
      starred: true,
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 7200000,
      deletedAt: null,
    },
    {
      id: 'note-3',
      title: 'Ideas',
      starred: false,
      createdAt: Date.now() - 259200000,
      updatedAt: Date.now() - 14400000,
      deletedAt: null,
    },
    {
      id: 'note-4',
      title: 'Shopping List',
      starred: false,
      createdAt: Date.now() - 345600000,
      updatedAt: Date.now() - 28800000,
      deletedAt: null,
    },
  ];
}
