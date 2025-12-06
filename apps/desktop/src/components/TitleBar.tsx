import { Component, createSignal, Show } from 'solid-js';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { DropdownMenu, MenuItem } from './DropdownMenu';
import { AboutOverlay } from './AboutOverlay';
import { ShortcutsOverlay } from './ShortcutsOverlay';
import './TitleBar.css';

export const TitleBar: Component = () => {
  const appWindow = getCurrentWindow();
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [showAbout, setShowAbout] = createSignal(false);
  const [showShortcuts, setShowShortcuts] = createSignal(false);

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  const handleDragStart = (e: MouseEvent) => {
    // Only start drag if clicking on the titlebar itself, not on buttons
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('.dropdown-menu')) return;
    appWindow.startDragging();
  };

  const handleDoubleClick = (e: MouseEvent) => {
    // Double-click to maximize/restore, but not on buttons
    if ((e.target as HTMLElement).closest('button')) return;
    appWindow.toggleMaximize();
  };

  const openLogsWindow = async () => {
    try {
      // Check if logs window already exists
      const existing = await WebviewWindow.getByLabel('logs');
      if (existing) {
        await existing.setFocus();
        return;
      }

      // Create new logs window
      new WebviewWindow('logs', {
        url: '/',
        title: 'PDTodo Logs',
        width: 700,
        height: 500,
        minWidth: 400,
        minHeight: 300,
        decorations: true,
        resizable: true,
        center: true,
      });
    } catch (error) {
      console.error('Failed to open logs window:', error);
    }
  };

  const menuItems: MenuItem[] = [
    {
      label: 'About',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2" />
          <path stroke-linecap="round" stroke-width="2" d="M12 16v-4M12 8h.01" />
        </svg>
      ),
      onClick: () => setShowAbout(true),
    },
    {
      label: 'Shortcuts',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="2" y="4" width="20" height="16" rx="2" stroke-width="2" />
          <path stroke-linecap="round" stroke-width="2" d="M6 8h2M10 8h2M14 8h4M6 12h4M12 12h2M16 12h2M8 16h8" />
        </svg>
      ),
      onClick: () => setShowShortcuts(true),
    },
    {
      label: 'Logs',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      onClick: openLogsWindow,
    },
  ];

  return (
    <>
      <header class="titlebar" onMouseDown={handleDragStart} onDblClick={handleDoubleClick}>
        <div class="titlebar-left">
          <button
            class="titlebar-btn menu-btn"
            classList={{ active: menuOpen() }}
            aria-label="Menu"
            onClick={() => setMenuOpen(!menuOpen())}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span class="titlebar-title">pdtodo</span>
          <DropdownMenu
            items={menuItems}
            isOpen={menuOpen()}
            onClose={() => setMenuOpen(false)}
          />
        </div>
        <div class="titlebar-center" />
        <div class="titlebar-right">
          <button class="titlebar-btn" onClick={handleMinimize} aria-label="Minimize">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect y="5" width="12" height="2" />
            </svg>
          </button>
          <button class="titlebar-btn" onClick={handleMaximize} aria-label="Maximize">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor">
              <rect x="1" y="1" width="10" height="10" stroke-width="2" />
            </svg>
          </button>
          <button class="titlebar-btn close-btn" onClick={handleClose} aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M1.41 0L0 1.41L4.59 6L0 10.59L1.41 12L6 7.41L10.59 12L12 10.59L7.41 6L12 1.41L10.59 0L6 4.59L1.41 0Z" />
            </svg>
          </button>
        </div>
      </header>
      <Show when={showAbout()}>
        <AboutOverlay onClose={() => setShowAbout(false)} />
      </Show>
      <Show when={showShortcuts()}>
        <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
      </Show>
    </>
  );
};
