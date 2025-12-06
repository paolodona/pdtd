import { Component, createEffect, onCleanup, For } from 'solid-js';
import { getShortcuts } from '../hooks/useKeyboardShortcuts';
import './ShortcutsOverlay.css';

interface ShortcutsOverlayProps {
  onClose: () => void;
}

interface ShortcutCategory {
  title: string;
  shortcuts: Array<{ key: string; description: string }>;
}

const editorShortcuts: Array<{ key: string; description: string }> = [
  { key: 'Ctrl+B', description: 'Bold' },
  { key: 'Ctrl+U', description: 'Underline' },
  { key: 'Ctrl+K', description: 'Add/Edit link' },
  { key: 'Ctrl+1', description: 'Heading 1' },
  { key: 'Ctrl+2', description: 'Heading 2' },
  { key: 'Ctrl+3', description: 'Heading 3' },
  { key: 'Ctrl+Shift+7', description: 'Numbered list' },
  { key: 'Ctrl+Shift+8', description: 'Bullet list' },
  { key: 'Ctrl+Shift+9', description: 'Task list' },
  { key: 'Tab', description: 'Indent list item' },
  { key: 'Shift+Tab', description: 'Outdent list item' },
  { key: 'Ctrl+Enter', description: 'Toggle task checkbox' },
];

export const ShortcutsOverlay: Component<ShortcutsOverlayProps> = (props) => {
  createEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
  });

  const globalShortcuts = getShortcuts().filter(
    (s, i, arr) => arr.findIndex((x) => x.description === s.description) === i
  );

  const categories: ShortcutCategory[] = [
    {
      title: 'General',
      shortcuts: globalShortcuts,
    },
    {
      title: 'Editor',
      shortcuts: editorShortcuts,
    },
  ];

  return (
    <div class="shortcuts-overlay" onClick={props.onClose}>
      <div class="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <button class="shortcuts-close-btn" onClick={props.onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 12 12" fill="currentColor">
            <path d="M1.41 0L0 1.41L4.59 6L0 10.59L1.41 12L6 7.41L10.59 12L12 10.59L7.41 6L12 1.41L10.59 0L6 4.59L1.41 0Z" />
          </svg>
        </button>

        <div class="shortcuts-header">
          <h1 class="shortcuts-title">Keyboard Shortcuts</h1>
        </div>

        <div class="shortcuts-content">
          <For each={categories}>
            {(category) => (
              <div class="shortcuts-category">
                <h2 class="shortcuts-category-title">{category.title}</h2>
                <div class="shortcuts-list">
                  <For each={category.shortcuts}>
                    {(shortcut) => (
                      <div class="shortcut-item">
                        <span class="shortcut-description">{shortcut.description}</span>
                        <kbd class="shortcut-key">{shortcut.key}</kbd>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};
