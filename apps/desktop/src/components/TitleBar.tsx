import { Component } from 'solid-js';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './TitleBar.css';

export const TitleBar: Component = () => {
  const appWindow = getCurrentWindow();

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  const handleDragStart = (e: MouseEvent) => {
    // Only start drag if clicking on the titlebar itself, not on buttons
    if ((e.target as HTMLElement).closest('button')) return;
    appWindow.startDragging();
  };

  const handleDoubleClick = (e: MouseEvent) => {
    // Double-click to maximize/restore, but not on buttons
    if ((e.target as HTMLElement).closest('button')) return;
    appWindow.toggleMaximize();
  };

  return (
    <header class="titlebar" onMouseDown={handleDragStart} onDblClick={handleDoubleClick}>
      <div class="titlebar-left">
        <button class="titlebar-btn menu-btn" aria-label="Menu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <span class="titlebar-title">PDTodo</span>
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
  );
};
