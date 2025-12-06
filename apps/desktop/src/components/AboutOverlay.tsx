import { Component, createSignal, onMount, createEffect, onCleanup } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { notesStore } from '../stores/notesStore';
import { settingsStore, setApiServerUrl } from '../stores/settingsStore';
import './AboutOverlay.css';

interface AppInfo {
  version: string;
  data_dir: string;
  environment: string;
}

interface AboutOverlayProps {
  onClose: () => void;
}

export const AboutOverlay: Component<AboutOverlayProps> = (props) => {
  const [appInfo, setAppInfo] = createSignal<AppInfo | null>(null);
  const [apiUrlInput, setApiUrlInput] = createSignal(settingsStore.apiServerUrl);
  const [isEditingUrl, setIsEditingUrl] = createSignal(false);

  onMount(async () => {
    try {
      const info = await invoke<AppInfo>('get_app_info');
      setAppInfo(info);
    } catch (error) {
      console.error('Failed to get app info:', error);
      // Mock data for development
      setAppInfo({
        version: '0.1.0',
        data_dir: 'Development Mode',
        environment: 'development',
      });
    }
  });

  createEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
  });

  const handleSaveApiUrl = () => {
    setApiServerUrl(apiUrlInput());
    setIsEditingUrl(false);
  };

  const handleCancelEdit = () => {
    setApiUrlInput(settingsStore.apiServerUrl);
    setIsEditingUrl(false);
  };

  return (
    <div class="about-overlay" onClick={props.onClose}>
      <div class="about-modal" onClick={(e) => e.stopPropagation()}>
        <button class="about-close-btn" onClick={props.onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 12 12" fill="currentColor">
            <path d="M1.41 0L0 1.41L4.59 6L0 10.59L1.41 12L6 7.41L10.59 12L12 10.59L7.41 6L12 1.41L10.59 0L6 4.59L1.41 0Z" />
          </svg>
        </button>

        <div class="about-header">
          <h1 class="about-title">PDTodo</h1>
          <span class="about-version">v{appInfo()?.version || '...'}</span>
        </div>

        <div class="about-description">
          <p>
            A minimalist, offline-first note-taking application designed for speed and simplicity.
            Built with CRDT-based synchronization for seamless conflict-free collaboration across devices.
          </p>
          <p>
            Your notes are stored locally and sync automatically when connected.
            Focus on your thoughts, not on managing your notes.
          </p>
        </div>

        <table class="about-info-table">
          <tbody>
            <tr>
              <td class="about-info-label">User</td>
              <td class="about-info-value">Not logged in</td>
            </tr>
            <tr>
              <td class="about-info-label">Storage</td>
              <td class="about-info-value about-info-path">{appInfo()?.data_dir || 'Loading...'}</td>
            </tr>
            <tr>
              <td class="about-info-label">Notes</td>
              <td class="about-info-value">{notesStore.activeNotes.length}</td>
            </tr>
            <tr>
              <td class="about-info-label">Environment</td>
              <td class="about-info-value">
                <span class={`about-env-badge about-env-${appInfo()?.environment || 'development'}`}>
                  {appInfo()?.environment || 'development'}
                </span>
              </td>
            </tr>
            <tr>
              <td class="about-info-label">API Server</td>
              <td class="about-info-value">
                {isEditingUrl() ? (
                  <div class="about-api-edit">
                    <input
                      type="text"
                      class="about-api-input"
                      value={apiUrlInput()}
                      onInput={(e) => setApiUrlInput(e.currentTarget.value)}
                      placeholder="https://api.example.com"
                    />
                    <button class="about-api-btn about-api-save" onClick={handleSaveApiUrl}>
                      Save
                    </button>
                    <button class="about-api-btn about-api-cancel" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div class="about-api-display">
                    <span class="about-api-url">
                      {settingsStore.apiServerUrl || 'Not configured'}
                    </span>
                    <button class="about-api-edit-btn" onClick={() => setIsEditingUrl(true)}>
                      Edit
                    </button>
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td class="about-info-label">Unsynced</td>
              <td class="about-info-value">0</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
