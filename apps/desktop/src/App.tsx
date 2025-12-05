import { Component, createSignal, onMount } from 'solid-js';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { TitleBar } from './components/TitleBar';
import { notesStore, loadNotes } from './stores/notesStore';
import { settingsStore, loadSettings } from './stores/settingsStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export const App: Component = () => {
  const [isReady, setIsReady] = createSignal(false);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  onMount(async () => {
    // Load settings and notes on startup
    await loadSettings();
    await loadNotes();
    setIsReady(true);
  });

  return (
    <div
      class="app"
      style={{
        '--font-size': `${settingsStore.fontSize}px`,
        '--sidebar-width': `${settingsStore.sidebarWidth}px`,
      }}
    >
      <TitleBar />
      <div class="app-content">
        <Sidebar />
        <main class="editor-container">
          {isReady() && notesStore.selectedNote ? (
            <Editor noteId={notesStore.selectedNote.id} />
          ) : (
            <div class="empty-state">
              <p>Select a note or create a new one</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
