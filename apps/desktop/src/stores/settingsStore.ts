import { createStore } from 'solid-js/store';
import type { UserSettings } from '@pdtodo/types';
import { DEFAULT_USER_SETTINGS } from '@pdtodo/types';

interface SettingsState extends UserSettings {
  isLoaded: boolean;
  apiServerUrl: string;
}

const [settingsState, setSettingsState] = createStore<SettingsState>({
  ...DEFAULT_USER_SETTINGS,
  isLoaded: false,
  apiServerUrl: '',
});

export const settingsStore = {
  get fontSize() {
    return settingsState.fontSize;
  },
  get sidebarWidth() {
    return settingsState.sidebarWidth;
  },
  get theme() {
    return settingsState.theme;
  },
  get isLoaded() {
    return settingsState.isLoaded;
  },
  get apiServerUrl() {
    return settingsState.apiServerUrl;
  },
  get allNotesExpanded() {
    return settingsState.allNotesExpanded;
  },
  get trashExpanded() {
    return settingsState.trashExpanded;
  },
  get lastOpenedNoteId() {
    return settingsState.lastOpenedNoteId;
  },
};

interface StoredSettings extends Partial<UserSettings> {
  apiServerUrl?: string;
}

/**
 * Load settings from storage
 */
export async function loadSettings(): Promise<void> {
  try {
    // In development without Tauri, use localStorage
    const stored = localStorage.getItem('pdtodo-settings');
    if (stored) {
      const settings = JSON.parse(stored) as StoredSettings;
      setSettingsState({
        fontSize: settings.fontSize ?? DEFAULT_USER_SETTINGS.fontSize,
        sidebarWidth: settings.sidebarWidth ?? DEFAULT_USER_SETTINGS.sidebarWidth,
        theme: settings.theme ?? DEFAULT_USER_SETTINGS.theme,
        allNotesExpanded: settings.allNotesExpanded ?? DEFAULT_USER_SETTINGS.allNotesExpanded,
        trashExpanded: settings.trashExpanded ?? DEFAULT_USER_SETTINGS.trashExpanded,
        lastOpenedNoteId: settings.lastOpenedNoteId ?? DEFAULT_USER_SETTINGS.lastOpenedNoteId,
        apiServerUrl: settings.apiServerUrl ?? '',
        isLoaded: true,
      });
    } else {
      setSettingsState('isLoaded', true);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    setSettingsState('isLoaded', true);
  }
}

/**
 * Save settings to storage
 */
async function saveSettings(): Promise<void> {
  try {
    const settings: StoredSettings = {
      fontSize: settingsState.fontSize,
      sidebarWidth: settingsState.sidebarWidth,
      theme: settingsState.theme,
      allNotesExpanded: settingsState.allNotesExpanded,
      trashExpanded: settingsState.trashExpanded,
      lastOpenedNoteId: settingsState.lastOpenedNoteId,
      apiServerUrl: settingsState.apiServerUrl,
    };
    localStorage.setItem('pdtodo-settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Update font size
 */
export function setFontSize(size: number): void {
  const clamped = Math.max(12, Math.min(24, size));
  setSettingsState('fontSize', clamped);
  saveSettings();
}

/**
 * Increase font size
 */
export function increaseFontSize(): void {
  setFontSize(settingsState.fontSize + 2);
}

/**
 * Decrease font size
 */
export function decreaseFontSize(): void {
  setFontSize(settingsState.fontSize - 2);
}

/**
 * Reset font size to default
 */
export function resetFontSize(): void {
  setFontSize(DEFAULT_USER_SETTINGS.fontSize);
}

/**
 * Update sidebar width
 */
export function setSidebarWidth(width: number): void {
  const clamped = Math.max(200, Math.min(400, width));
  setSettingsState('sidebarWidth', clamped);
  saveSettings();
}

/**
 * Update theme
 */
export function setTheme(theme: 'dark' | 'light' | 'system'): void {
  setSettingsState('theme', theme);
  saveSettings();
}

/**
 * Update API server URL
 */
export function setApiServerUrl(url: string): void {
  setSettingsState('apiServerUrl', url);
  saveSettings();
}

/**
 * Update All Notes section expanded state
 */
export function setAllNotesExpanded(expanded: boolean): void {
  setSettingsState('allNotesExpanded', expanded);
  saveSettings();
}

/**
 * Update Trash section expanded state
 */
export function setTrashExpanded(expanded: boolean): void {
  setSettingsState('trashExpanded', expanded);
  saveSettings();
}

/**
 * Update last opened note ID
 */
export function setLastOpenedNoteId(noteId: string | null): void {
  setSettingsState('lastOpenedNoteId', noteId);
  saveSettings();
}
