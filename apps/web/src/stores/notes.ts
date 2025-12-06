import { createSignal, createRoot } from 'solid-js';
import { api, NoteMeta, Note } from '../lib/api';

function createNotesStore() {
  const [notes, setNotes] = createSignal<NoteMeta[]>([]);
  const [currentNote, setCurrentNote] = createSignal<Note | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = createSignal<number>(0);

  const fetchNotes = async (includeDeleted = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.listNotes(includeDeleted);
      setNotes(response.notes);
      setLastSyncTime(response.serverTime);
      return response.notes;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to fetch notes';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const selectNote = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const note = await api.getNote(id);
      setCurrentNote(note);
      return note;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to fetch note';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const createNote = async (title: string = 'Untitled', content: string = '') => {
    setError(null);
    try {
      const id = crypto.randomUUID();
      // Encode content as base64 if not already
      const encodedContent = btoa(content || '');
      const result = await api.createNote(id, title, encodedContent);

      // Add to local list
      const newNoteMeta: NoteMeta = {
        id: result.id,
        title,
        starred: false,
        createdAt: result.createdAt,
        updatedAt: result.createdAt,
        deletedAt: null,
      };
      setNotes((prev) => [newNoteMeta, ...prev]);

      // Select the new note
      const note = await api.getNote(result.id);
      setCurrentNote(note);

      return note;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create note';
      setError(message);
      throw e;
    }
  };

  const updateNote = async (
    id: string,
    updates: { title?: string; content?: string; starred?: boolean }
  ) => {
    setError(null);
    try {
      const note = await api.updateNote(id, updates);
      setCurrentNote(note);

      // Update local list
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                title: note.title,
                starred: note.starred,
                updatedAt: note.updatedAt,
              }
            : n
        )
      );

      return note;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update note';
      setError(message);
      throw e;
    }
  };

  const deleteNote = async (id: string) => {
    setError(null);
    try {
      const result = await api.deleteNote(id);

      // Remove from local list (or mark as deleted)
      setNotes((prev) => prev.filter((n) => n.id !== id));

      // Clear current note if it was the deleted one
      if (currentNote()?.id === id) {
        setCurrentNote(null);
      }

      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete note';
      setError(message);
      throw e;
    }
  };

  const toggleStar = async (id: string) => {
    const note = notes().find((n) => n.id === id);
    if (!note) return;

    await updateNote(id, { starred: !note.starred });
  };

  const clearCurrentNote = () => {
    setCurrentNote(null);
  };

  return {
    notes,
    currentNote,
    isLoading,
    error,
    lastSyncTime,
    fetchNotes,
    selectNote,
    createNote,
    updateNote,
    deleteNote,
    toggleStar,
    clearCurrentNote,
  };
}

export const notesStore = createRoot(createNotesStore);
