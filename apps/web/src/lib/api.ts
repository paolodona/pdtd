const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface NoteMeta {
  id: string;
  title: string;
  starred: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface Note {
  id: string;
  title: string;
  content: string; // Base64 encoded
  starred: boolean;
  createdAt: number;
  updatedAt: number;
  stateVector: string | null;
}

export interface NotesListResponse {
  notes: NoteMeta[];
  serverTime: number;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    this.loadTokens();
  }

  private loadTokens() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    const expiry = localStorage.getItem('tokenExpiry');
    this.tokenExpiry = expiry ? parseInt(expiry, 10) : null;
  }

  private saveTokens(auth: AuthResponse) {
    this.accessToken = auth.accessToken;
    this.refreshToken = auth.refreshToken;
    this.tokenExpiry = Date.now() + auth.expiresIn * 1000;

    localStorage.setItem('accessToken', auth.accessToken);
    localStorage.setItem('refreshToken', auth.refreshToken);
    localStorage.setItem('tokenExpiry', this.tokenExpiry.toString());
    localStorage.setItem('user', JSON.stringify(auth.user));
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('user');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.tokenExpiry && Date.now() < this.tokenExpiry;
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  private async ensureValidToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    if (!this.refreshToken) {
      throw new Error('Not authenticated');
    }

    // Refresh the token
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Session expired');
    }

    const auth: AuthResponse = await response.json();
    this.saveTokens(auth);
    return auth.accessToken;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.ensureValidToken();

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth methods
  async googleAuth(code: string, redirectUri: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Authentication failed');
    }

    const auth: AuthResponse = await response.json();
    this.saveTokens(auth);
    return auth;
  }

  async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      } catch {
        // Ignore errors during logout
      }
    }
    this.clearTokens();
  }

  // User methods
  async getCurrentUser(): Promise<User> {
    return this.request('/user/me');
  }

  async updateSettings(settings: Record<string, unknown>): Promise<void> {
    await this.request('/user/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // Notes methods
  async listNotes(includeDeleted = false, since?: number): Promise<NotesListResponse> {
    const params = new URLSearchParams();
    if (includeDeleted) params.set('includeDeleted', 'true');
    if (since) params.set('since', since.toString());
    const query = params.toString();
    return this.request(`/notes${query ? `?${query}` : ''}`);
  }

  async getNote(id: string): Promise<Note> {
    return this.request(`/notes/${id}`);
  }

  async createNote(id: string, title: string, content: string, starred = false): Promise<{ id: string; createdAt: number }> {
    return this.request('/notes', {
      method: 'POST',
      body: JSON.stringify({ id, title, content, starred }),
    });
  }

  async updateNote(
    id: string,
    updates: { title?: string; content?: string; starred?: boolean; stateVector?: string }
  ): Promise<Note> {
    return this.request(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteNote(id: string): Promise<{ deletedAt: number }> {
    return this.request(`/notes/${id}`, { method: 'DELETE' });
  }

  async restoreNote(id: string): Promise<{ restoredAt: number }> {
    return this.request(`/notes/${id}/restore`, { method: 'POST' });
  }

  async permanentDeleteNote(id: string): Promise<void> {
    await this.request(`/notes/${id}/permanent`, { method: 'DELETE' });
  }

  // Sync methods
  async pushUpdates(updates: { noteId: string; update: string; timestamp: number }[]): Promise<{
    processed: string[];
    conflicts: string[];
    serverTime: number;
  }> {
    return this.request('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    });
  }

  async pullUpdates(stateVectors: Record<string, string>, since: number): Promise<{
    updates: Record<string, string[]>;
    newNotes: { id: string; title: string; content: string; starred: boolean; createdAt: number }[];
    deletedNotes: string[];
    serverTime: number;
  }> {
    return this.request('/sync/pull', {
      method: 'POST',
      body: JSON.stringify({ stateVectors, since }),
    });
  }
}

export const api = new ApiClient();
