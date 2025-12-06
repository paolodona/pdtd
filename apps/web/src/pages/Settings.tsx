import { Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { authStore } from '../stores/auth';

export const Settings: Component = () => {
  const navigate = useNavigate();
  const user = authStore.user;

  const handleLogout = async () => {
    await authStore.logout();
    navigate('/login', { replace: true });
  };

  return (
    <div class="settings-page">
      <header class="settings-header">
        <button class="btn-secondary back-btn" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
        <h1>Settings</h1>
      </header>
      <div class="settings-content">
        <section class="settings-section">
          <h2>Appearance</h2>
          <div class="setting-item">
            <label>Theme</label>
            <select>
              <option value="dark">Dark</option>
              <option value="light" disabled>Light (coming soon)</option>
              <option value="system" disabled>System (coming soon)</option>
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
            <span>{user()?.email || 'Not signed in'}</span>
          </div>
          <div class="setting-item">
            <label>Name</label>
            <span>{user()?.name || 'Unknown'}</span>
          </div>
          <button class="logout-btn" onClick={handleLogout}>Sign Out</button>
        </section>

        <section class="settings-section">
          <h2>About</h2>
          <div class="setting-item">
            <label>Version</label>
            <span>0.1.0</span>
          </div>
        </section>
      </div>
    </div>
  );
};
