/**
 * Sync update structure
 */
export interface SyncUpdate {
  /** Note UUID */
  noteId: string;
  /** Device identifier */
  clientId: string;
  /** Yjs binary update */
  update: Uint8Array;
  /** Timestamp when update was created */
  timestamp: number;
  /** Yjs state vector for determining missing updates */
  stateVector: Uint8Array;
}

/**
 * Sync push request
 */
export interface SyncPushRequest {
  updates: Array<{
    noteId: string;
    update: string; // Base64 encoded
    timestamp: number;
  }>;
}

/**
 * Sync push response
 */
export interface SyncPushResponse {
  processed: string[];
  conflicts: string[];
  serverTime: number;
}

/**
 * Sync pull request
 */
export interface SyncPullRequest {
  stateVectors: Record<string, string>; // noteId -> Base64 state vector
  since: number; // Timestamp for new notes
}

/**
 * Sync pull response
 */
export interface SyncPullResponse {
  updates: Record<string, string[]>; // noteId -> Base64 updates
  newNotes: Array<{
    id: string;
    title: string;
    content: string; // Base64 encoded
    starred: boolean;
    createdAt: number;
  }>;
  deletedNotes: string[];
  serverTime: number;
}

/**
 * WebSocket message types
 */
export type WebSocketMessage =
  | { type: 'subscribe'; noteIds: string[] }
  | { type: 'update'; noteId: string; update: string }
  | { type: 'ping' }
  | { type: 'noteCreated'; note: { id: string; title: string; content: string; starred: boolean; createdAt: number } }
  | { type: 'noteDeleted'; noteId: string }
  | { type: 'pong' };
