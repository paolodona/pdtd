/**
 * API error response
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Authentication response
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * API error codes
 */
export enum ErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOTE_NOT_FOUND = 'NOTE_NOT_FOUND',
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Notes list response
 */
export interface NotesListResponse {
  notes: Array<{
    id: string;
    title: string;
    starred: boolean;
    createdAt: number;
    updatedAt: number;
    deletedAt: number | null;
  }>;
  serverTime: number;
}

/**
 * Note response with full content
 */
export interface NoteResponse {
  id: string;
  title: string;
  content: string; // Base64 encoded Yjs doc
  starred: boolean;
  createdAt: number;
  updatedAt: number;
  stateVector: string; // Base64 encoded
}
