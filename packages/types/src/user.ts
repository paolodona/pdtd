/**
 * User profile
 */
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: number;
  settings: UserSettings;
}

/**
 * User settings (persisted)
 */
export interface UserSettings {
  /** Font size in pixels (default: 16) */
  fontSize: number;
  /** Sidebar width in pixels (default: 280) */
  sidebarWidth: number;
  /** Theme preference */
  theme: 'dark' | 'light' | 'system';
}

/**
 * Default user settings
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  fontSize: 16,
  sidebarWidth: 280,
  theme: 'dark',
};
