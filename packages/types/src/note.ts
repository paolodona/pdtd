/**
 * Core note data structure
 */
export interface Note {
  /** UUID v7 (time-sortable) */
  id: string;
  /** Owner's user ID */
  userId: string;
  /** Note subject/title */
  title: string;
  /** Yjs document (binary) - stored as Uint8Array */
  content: Uint8Array;
  /** Pinned to shortcuts */
  starred: boolean;
  /** Unix timestamp (milliseconds) */
  createdAt: number;
  /** Last modification timestamp (milliseconds) */
  updatedAt: number;
  /** Soft delete timestamp (null if not deleted) */
  deletedAt: number | null;
  /** Optimistic locking version */
  version: number;
}

/**
 * Note metadata (without content) for list display
 */
export interface NoteMeta {
  id: string;
  title: string;
  starred: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/**
 * Note creation input
 */
export interface CreateNoteInput {
  id: string;
  title: string;
  content: Uint8Array;
  starred?: boolean;
}

/**
 * Note update input
 */
export interface UpdateNoteInput {
  title?: string;
  starred?: boolean;
}
