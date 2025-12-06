import { onMount, onCleanup } from 'solid-js';
import { createNote, deleteNote, duplicateNote, notesStore } from '../stores/notesStore';
import { increaseFontSize, decreaseFontSize, resetFontSize } from '../stores/settingsStore';
import { focusSearch } from '../stores/focusStore';

type KeyHandler = (event: KeyboardEvent) => boolean | void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: KeyHandler;
  description: string;
}

const shortcuts: ShortcutConfig[] = [
  {
    key: 'f',
    ctrl: true,
    handler: () => {
      return focusSearch();
    },
    description: 'Search notes',
  },
  {
    key: 'n',
    ctrl: true,
    handler: () => {
      createNote();
      return true;
    },
    description: 'New note',
  },
  {
    key: '=',
    ctrl: true,
    handler: () => {
      increaseFontSize();
      return true;
    },
    description: 'Increase font size',
  },
  {
    key: '+',
    ctrl: true,
    handler: () => {
      increaseFontSize();
      return true;
    },
    description: 'Increase font size',
  },
  {
    key: '-',
    ctrl: true,
    handler: () => {
      decreaseFontSize();
      return true;
    },
    description: 'Decrease font size',
  },
  {
    key: '0',
    ctrl: true,
    handler: () => {
      resetFontSize();
      return true;
    },
    description: 'Reset font size',
  },
  {
    key: 'Delete',
    ctrl: true,
    handler: () => {
      const selectedId = notesStore.selectedNoteId;
      if (selectedId) {
        deleteNote(selectedId);
        return true;
      }
      return false;
    },
    description: 'Move note to trash',
  },
  {
    key: 'd',
    ctrl: true,
    shift: true,
    handler: () => {
      const selectedId = notesStore.selectedNoteId;
      if (selectedId) {
        duplicateNote(selectedId);
        return true;
      }
      return false;
    },
    description: 'Duplicate note',
  },
];

function matchesShortcut(event: KeyboardEvent, config: ShortcutConfig): boolean {
  const ctrlOrMeta = event.ctrlKey || event.metaKey;

  if ((config.ctrl ?? false) !== ctrlOrMeta) return false;
  if ((config.shift ?? false) !== event.shiftKey) return false;
  if ((config.alt ?? false) !== event.altKey) return false;

  return event.key.toLowerCase() === config.key.toLowerCase();
}

export function useKeyboardShortcuts(): void {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Don't handle shortcuts when typing in input fields (except for specific global shortcuts)
    const target = event.target as HTMLElement;
    const isInputField =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;

    for (const shortcut of shortcuts) {
      if (matchesShortcut(event, shortcut)) {
        // Allow font size shortcuts even in input fields
        const isFontSizeShortcut =
          shortcut.key === '=' || shortcut.key === '+' || shortcut.key === '-' || shortcut.key === '0';

        if (isInputField && !isFontSizeShortcut && !shortcut.ctrl) {
          continue;
        }

        const result = shortcut.handler(event);
        if (result) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
    }
  };

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
}

// Export the shortcuts for displaying in help/settings
export function getShortcuts(): Array<{ key: string; description: string }> {
  return shortcuts.map((s) => {
    let key = '';
    if (s.ctrl) key += 'Ctrl+';
    if (s.shift) key += 'Shift+';
    if (s.alt) key += 'Alt+';
    key += s.key.toUpperCase();
    return { key, description: s.description };
  });
}
