import { Component } from 'solid-js';

export const Settings: Component = () => {
  return (
    <div class="settings-page">
      <header class="settings-header">
        <h1>Settings</h1>
      </header>
      <div class="settings-content">
        <section class="settings-section">
          <h2>Appearance</h2>
          <div class="setting-item">
            <label>Theme</label>
            <select>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
          <div class="setting-item">
            <label>Font Size</label>
            <input type="range" min="12" max="24" value="16" />
          </div>
        </section>

        <section class="settings-section">
          <h2>Account</h2>
          <div class="setting-item">
            <label>Email</label>
            <span>user@example.com</span>
          </div>
          <button class="logout-btn">Sign Out</button>
        </section>
      </div>
    </div>
  );
};
