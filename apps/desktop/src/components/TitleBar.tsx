import { Component } from 'solid-js';
import './TitleBar.css';

export const TitleBar: Component = () => {
  return (
    <header class="titlebar" data-tauri-drag-region>
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
      <div class="titlebar-center" data-tauri-drag-region />
      <div class="titlebar-right">
        <button class="titlebar-btn" data-tauri-minimize aria-label="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect y="5" width="12" height="2" />
          </svg>
        </button>
        <button class="titlebar-btn" data-tauri-maximize aria-label="Maximize">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor">
            <rect x="1" y="1" width="10" height="10" stroke-width="2" />
          </svg>
        </button>
        <button class="titlebar-btn close-btn" data-tauri-close aria-label="Close">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M1.41 0L0 1.41L4.59 6L0 10.59L1.41 12L6 7.41L10.59 12L12 10.59L7.41 6L12 1.41L10.59 0L6 4.59L1.41 0Z" />
          </svg>
        </button>
      </div>
    </header>
  );
};
