import * as Y from 'yjs';
import { applyUpdate, getStateVector, getMissingUpdates } from './document';

export interface SyncProviderOptions {
  /** WebSocket URL for real-time sync */
  wsUrl?: string;
  /** HTTP API URL for pull/push sync */
  apiUrl?: string;
  /** Auth token for API requests */
  authToken?: string;
  /** Callback when sync status changes */
  onSyncStatusChange?: (status: SyncStatus) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'synced';

export interface PendingUpdate {
  noteId: string;
  update: Uint8Array;
  timestamp: number;
}

/**
 * Sync provider for managing Yjs document synchronization
 */
export class SyncProvider {
  private ws: WebSocket | null = null;
  private options: SyncProviderOptions;
  private status: SyncStatus = 'disconnected';
  private pendingUpdates: Map<string, PendingUpdate[]> = new Map();
  private documents: Map<string, Y.Doc> = new Map();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(options: SyncProviderOptions) {
    this.options = options;
  }

  /**
   * Register a document for synchronization
   */
  registerDocument(noteId: string, doc: Y.Doc): void {
    this.documents.set(noteId, doc);

    // Listen for local changes
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== 'remote') {
        this.queueUpdate(noteId, update);
      }
    });
  }

  /**
   * Unregister a document from synchronization
   */
  unregisterDocument(noteId: string): void {
    const doc = this.documents.get(noteId);
    if (doc) {
      doc.off('update', () => {});
      this.documents.delete(noteId);
    }
  }

  /**
   * Queue an update for synchronization
   */
  private queueUpdate(noteId: string, update: Uint8Array): void {
    const pending = this.pendingUpdates.get(noteId) ?? [];
    pending.push({
      noteId,
      update,
      timestamp: Date.now(),
    });
    this.pendingUpdates.set(noteId, pending);
  }

  /**
   * Connect to the sync server via WebSocket
   */
  connect(): void {
    if (!this.options.wsUrl || this.ws) return;

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.options.wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;

        // Subscribe to all registered documents
        const noteIds = Array.from(this.documents.keys());
        if (noteIds.length > 0) {
          this.send({ type: 'subscribe', noteIds });
        }

        // Push any pending updates
        this.pushPendingUpdates();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          this.options.onError?.(error as Error);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (event) => {
        this.options.onError?.(new Error('WebSocket error'));
      };
    } catch (error) {
      this.options.onError?.(error as Error);
      this.setStatus('disconnected');
    }
  }

  /**
   * Disconnect from the sync server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Push all pending updates to the server
   */
  async pushPendingUpdates(): Promise<void> {
    if (!this.options.apiUrl || this.pendingUpdates.size === 0) return;

    this.setStatus('syncing');

    const updates: Array<{ noteId: string; update: string; timestamp: number }> = [];

    for (const [noteId, pending] of this.pendingUpdates.entries()) {
      for (const p of pending) {
        updates.push({
          noteId: p.noteId,
          update: this.encodeBase64(p.update),
          timestamp: p.timestamp,
        });
      }
    }

    try {
      const response = await fetch(`${this.options.apiUrl}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.authToken}`,
        },
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        const result = await response.json();
        // Clear processed updates
        for (const noteId of result.processed) {
          this.pendingUpdates.delete(noteId);
        }
        this.setStatus('synced');
      } else {
        throw new Error(`Push failed: ${response.status}`);
      }
    } catch (error) {
      this.options.onError?.(error as Error);
      this.setStatus('connected');
    }
  }

  /**
   * Pull updates from the server
   */
  async pullUpdates(): Promise<void> {
    if (!this.options.apiUrl) return;

    this.setStatus('syncing');

    const stateVectors: Record<string, string> = {};
    for (const [noteId, doc] of this.documents.entries()) {
      stateVectors[noteId] = this.encodeBase64(getStateVector(doc));
    }

    try {
      const response = await fetch(`${this.options.apiUrl}/sync/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.authToken}`,
        },
        body: JSON.stringify({ stateVectors, since: 0 }),
      });

      if (response.ok) {
        const result = await response.json();

        // Apply updates to documents
        for (const [noteId, updates] of Object.entries(result.updates)) {
          const doc = this.documents.get(noteId);
          if (doc) {
            for (const update of updates as string[]) {
              applyUpdate(doc, this.decodeBase64(update));
            }
          }
        }

        this.setStatus('synced');
      } else {
        throw new Error(`Pull failed: ${response.status}`);
      }
    } catch (error) {
      this.options.onError?.(error as Error);
      this.setStatus('connected');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: unknown): void {
    const msg = message as { type: string; noteId?: string; update?: string };

    switch (msg.type) {
      case 'update':
        if (msg.noteId && msg.update) {
          const doc = this.documents.get(msg.noteId);
          if (doc) {
            applyUpdate(doc, this.decodeBase64(msg.update));
          }
        }
        break;
      case 'pong':
        // Keepalive response
        break;
    }
  }

  /**
   * Send a message via WebSocket
   */
  private send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Update and notify sync status
   */
  private setStatus(status: SyncStatus): void {
    this.status = status;
    this.options.onSyncStatusChange?.(status);
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Encode Uint8Array to base64
   */
  private encodeBase64(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data));
  }

  /**
   * Decode base64 to Uint8Array
   */
  private decodeBase64(data: string): Uint8Array {
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}
