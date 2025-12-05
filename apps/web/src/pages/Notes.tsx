import { Component } from 'solid-js';

export const Notes: Component = () => {
  return (
    <div class="notes-page">
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>PDTodo</h2>
        </div>
        <nav class="sidebar-nav">
          <p>Notes will appear here...</p>
        </nav>
      </aside>
      <main class="main-content">
        <div class="empty-state">
          <p>Select a note or create a new one</p>
        </div>
      </main>
    </div>
  );
};
