PDTodo - Technical Architecture Plan
Version: 1.0
Date: December 2024
Domain: pdtodo.com

Executive Summary
This document outlines the architecture for PDTodo, a lightning-fast, offline-first note-taking application with distributed synchronization capabilities. The system prioritizes:

Speed - Sub-100ms startup, instant saves
Offline-first - Full functionality without network
Conflict-free sync - No duplicate notes, automatic merging
Minimalism - Clean UI, small footprint, low dependencies
Technology Stack Selection
Desktop Application: Tauri 2.0 + Rust
Why Tauri over Electron:

Aspect	Tauri	Electron
Bundle size	~10-15 MB	~150-200 MB
Memory usage	~30-50 MB	~150-300 MB
Startup time	~200ms	~2-3 seconds
Native performance	Rust backend	Node.js
Security	Sandboxed by default	Less secure
Tauri uses the system's native WebView (WebView2 on Windows 11), eliminating the need to bundle Chromium. The Rust backend provides native-speed file operations and CRDT calculations.

Frontend Framework: SolidJS
Why SolidJS over React/Vue:

No virtual DOM = faster updates
Smaller bundle (~7KB vs React's ~45KB)
Fine-grained reactivity (only updates what changes)
Familiar JSX syntax
Excellent TypeScript support
Rich Text Editor: TipTap 2 (ProseMirror-based)
Why TipTap:

Built-in support for checklists, lists, nested indentation
Collaborative editing ready (CRDT-compatible)
Highly customizable and extensible
Excellent performance with large documents
Active maintenance and community
Conflict Resolution: Yjs (CRDT Library)
Why CRDTs over traditional Git-style diffs:

CRDTs (Conflict-free Replicated Data Types) automatically merge concurrent edits without conflicts. Unlike Git which requires manual merge resolution, CRDTs guarantee that all replicas converge to the same state regardless of the order operations are received.

Yjs is battle-tested (used by Notion, JupyterLab)
Native TipTap integration via y-prosemirror
Supports offline editing with automatic sync
Binary encoding = small update payloads
Local Storage: SQLite + Flat Files
SQLite via rusqlite: Fast indexing, full-text search (FTS5)
Flat files: JSON documents for external editability
Yjs updates: Binary files for CRDT state
Backend API: Rust + Axum
Why Rust for the backend:

Consistent with Tauri (shared code possible)
Extremely fast request handling
Low memory footprint
Excellent async support
Server Database: PostgreSQL + Redis
PostgreSQL: Primary data store, user accounts, note metadata
Redis: Real-time sync pub/sub, session caching
Web Application: Same stack as Desktop frontend
SolidJS + TipTap + Yjs
Deployed as static site (Cloudflare Pages or similar)
Connects to same API
Authentication: Google OAuth 2.0 + JWT
Initial login via Google
JWT tokens for API authentication
Refresh token rotation for security
Architecture Overview
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PDTodo Architecture                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Desktop App    │     │    Web App      │     │  Android App    │
│  (Tauri + Rust) │     │   (SolidJS)     │     │   (Future)      │
│                 │     │                 │     │                 │
│  ┌───────────┐  │     │  ┌───────────┐  │     │  ┌───────────┐  │
│  │  SolidJS  │  │     │  │  SolidJS  │  │     │  │  Kotlin/  │  │
│  │  TipTap   │  │     │  │  TipTap   │  │     │  │  Compose  │  │
│  │   Yjs     │  │     │  │   Yjs     │  │     │  │   Yjs     │  │
│  └───────────┘  │     │  └───────────┘  │     │  └───────────┘  │
│        │        │     │        │        │     │        │        │
│  ┌───────────┐  │     │  ┌───────────┐  │     │  ┌───────────┐  │
│  │   Rust    │  │     │  │ IndexedDB │  │     │  │  SQLite   │  │
│  │  SQLite   │  │     │  │  (Cache)  │  │     │  │  (Local)  │  │
│  │  + Files  │  │     │  └───────────┘  │     │  └───────────┘  │
│  └───────────┘  │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │    Yjs Updates        │    Yjs Updates        │
         │    (Binary deltas)    │    (Binary deltas)    │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     PDTodo API Server   │
                    │      (Rust + Axum)      │
                    │                         │
                    │  ┌─────────────────┐    │
                    │  │  Sync Engine    │    │
                    │  │  (Yjs Server)   │    │
                    │  └─────────────────┘    │
                    │           │             │
                    │  ┌────────┴────────┐    │
                    │  │                 │    │
                    │  ▼                 ▼    │
                    │ PostgreSQL      Redis  │
                    │ (Notes, Users)  (Sync) │
                    └─────────────────────────┘

Data Model
Note Structure
interface Note {
  id: string;              // UUID v7 (time-sortable)
  userId: string;          // Owner's user ID
  title: string;           // Note subject/title
  content: Uint8Array;     // Yjs document (binary)
  starred: boolean;        // Pinned to shortcuts
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Last modification
  deletedAt: number | null; // Soft delete timestamp
  version: number;         // Optimistic locking
}

Yjs Document Structure
// The TipTap content is stored as a Yjs document
// This enables CRDT-based merging

interface NoteYDoc {
  // Yjs XmlFragment for TipTap content
  content: Y.XmlFragment;
  
  // Metadata as Yjs Map (also CRDT-enabled)
  meta: Y.Map<{
    title: string;
    starred: boolean;
  }>;
}

Sync Update Format
interface SyncUpdate {
  noteId: string;
  clientId: string;        // Device identifier
  update: Uint8Array;      // Yjs binary update
  timestamp: number;
  stateVector: Uint8Array; // For determining missing updates
}

Sync Protocol
How CRDT Sync Works
Local Edit: User types in TipTap → Yjs generates binary update
Local Save: Update appended to local update log (every 5-10 seconds)
Sync Push: When online, updates sent to server
Server Merge: Server applies updates to canonical Yjs doc
Sync Pull: Other clients receive updates via WebSocket
Remote Apply: Clients apply updates → automatic merge
Conflict Resolution Example
Timeline:
─────────────────────────────────────────────────────────►

Desktop (offline):     Edit A ──────────► Edit B
                            \
Web (online):                Edit C ─────────► Edit D
                                   \
                                    Server applies: A, C, B, D
                                    (Order doesn't matter - CRDTs converge)

Result: Both clients end up with same document containing all edits

Update Log Structure (Local)
%APPDATA%/pdtodo/
├── notes/
│   ├── {note-id-1}/
│   │   ├── doc.yjs          # Full Yjs document state
│   │   ├── updates/         # Pending updates to sync
│   │   │   ├── 001.bin
│   │   │   ├── 002.bin
│   │   │   └── ...
│   │   └── meta.json        # Local metadata
│   └── {note-id-2}/
│       └── ...
├── index.sqlite             # Search index, note list
├── auth.json                # Encrypted auth tokens
└── config.json              # User settings

Desktop Application Design
Window Layout
┌─────────────────────────────────────────────────────────────────────────┐
│  ═══════════════════════════════════════════════════════════════════   │
│  ☰  PDTodo                                            ─  □  ✕          │
│  ═══════════════════════════════════════════════════════════════════   │
├───────────────────────┬─────────────────────────────────────────────────┤
│                       │                                                 │
│  🔍 Search notes...   │   Meeting Notes - Project Alpha                │
│  ─────────────────── │   ─────────────────────────────────────────────│
│                       │                                                 │
│  ★ SHORTCUTS          │   # Action Items                               │
│  ─────────────────── │                                                 │
│    📌 Daily Tasks     │   ☑ Review PR #142 (strikethrough, grey)       │
│    📌 Project Alpha   │   ☐ Update documentation                       │
│                       │   ☐ Schedule team sync                         │
│  📁 ALL NOTES         │      ☐ Send calendar invite                    │
│  ─────────────────── │      ☐ Prepare agenda                          │
│    Meeting Notes      │                                                 │
│    Ideas              │   ## Notes                                      │
│    Shopping List      │                                                 │
│    ...                │   Discussion about the **new feature**:        │
│                       │   - Timeline: 2 weeks                          │
│                       │   - Resources: 3 engineers                     │
│                       │                                                 │
│  🗑️ TRASH             │                                                 │
│                       │                                                 │
└───────────────────────┴─────────────────────────────────────────────────┘

Color Scheme (Dark Theme)
:root {
  /* Background colors */
  --bg-primary: #1a1a1a;       /* Main background */
  --bg-secondary: #242424;      /* Sidebar, panels */
  --bg-tertiary: #2d2d2d;       /* Hover states, cards */
  --bg-input: #1f1f1f;          /* Input fields */
  
  /* Text colors */
  --text-primary: #e8e8e8;      /* Main text */
  --text-secondary: #a0a0a0;    /* Secondary text */
  --text-muted: #666666;        /* Completed items, placeholders */
  --text-disabled: #444444;     /* Disabled elements */
  
  /* Accent colors */
  --accent-primary: #4a9eff;    /* Links, selections, focus */
  --accent-hover: #6bb0ff;      /* Hover on accent elements */
  --accent-success: #4caf50;    /* Checkboxes checked */
  --accent-warning: #ff9800;    /* Warnings */
  --accent-danger: #f44336;     /* Delete, errors */
  
  /* Borders and dividers */
  --border-primary: #333333;    /* Main borders */
  --border-secondary: #2a2a2a;  /* Subtle dividers */
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
}

Typography
:root {
  /* Font family - similar to Evernote's sans-serif */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                 Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', 
                 sans-serif;
  
  /* Font sizes (base: 16px, scalable via Ctrl+/Ctrl-) */
  --font-size-xs: 0.75rem;      /* 12px */
  --font-size-sm: 0.875rem;     /* 14px */
  --font-size-base: 1rem;       /* 16px */
  --font-size-lg: 1.125rem;     /* 18px */
  --font-size-xl: 1.25rem;      /* 20px */
  
  /* Headings */
  --font-size-h1: 1.75rem;      /* 28px */
  --font-size-h2: 1.5rem;       /* 24px */
  --font-size-h3: 1.25rem;      /* 20px */
  
  /* Line heights */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* Font weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}

Keyboard Shortcuts
Shortcut	Action
Ctrl+N	New note
Ctrl+F	Search by title
Ctrl+Shift+F	Search in note body
Ctrl+S	Force save (auto-saves anyway)
Ctrl++ / Ctrl+=	Increase font size
Ctrl+-	Decrease font size
Ctrl+0	Reset font size to default
Ctrl+B	Bold
Ctrl+U	Underline
Ctrl+1	Heading 1
Ctrl+2	Heading 2
Ctrl+3	Heading 3
Ctrl+Shift+7	Numbered list
Ctrl+Shift+8	Bullet list
Ctrl+Shift+9	Checklist
Ctrl+Enter	Toggle checkbox
Tab	Indent list item
Shift+Tab	Outdent list item
Ctrl+Delete	Move note to trash
Ctrl+Shift+D	Duplicate note
Ctrl+,	Open settings
Escape	Close search / deselect
API Specification
Base URL
Production: https://api.pdtodo.com
Development: http://localhost:3000
Authentication
All API requests (except /auth/*) require a valid JWT token in the Authorization header:

Authorization: Bearer <jwt_token>

Endpoints
Authentication
POST   /auth/google           # Exchange Google OAuth code for JWT
  Request:
    { "code": "google_auth_code", "redirect_uri": "..." }
  Response:
    { "accessToken": "jwt...", "refreshToken": "...", "expiresIn": 3600 }

POST   /auth/refresh          # Refresh JWT token
  Request:
    { "refreshToken": "..." }
  Response:
    { "accessToken": "jwt...", "refreshToken": "...", "expiresIn": 3600 }

POST   /auth/logout           # Invalidate refresh token
  Request:
    { "refreshToken": "..." }
  Response:
    { "success": true }

Notes
GET    /notes                 # List all notes (metadata only)
  Query params:
    - includeDeleted: boolean (default: false)
    - since: timestamp (for incremental sync)
  Response:
    {
      "notes": [
        {
          "id": "01HXK5...",
          "title": "Meeting Notes",
          "starred": true,
          "createdAt": 1699999999999,
          "updatedAt": 1699999999999,
          "deletedAt": null
        }
      ],
      "serverTime": 1699999999999
    }

POST   /notes                 # Create new note
  Request:
    {
      "id": "01HXK5...",  # Client-generated UUID v7
      "title": "New Note",
      "content": "<base64-yjs-doc>",
      "starred": false
    }
  Response:
    { "id": "01HXK5...", "createdAt": 1699999999999 }

GET    /notes/:id             # Get note with full Yjs state
  Response:
    {
      "id": "01HXK5...",
      "title": "Meeting Notes",
      "content": "<base64-yjs-doc>",
      "starred": true,
      "createdAt": 1699999999999,
      "updatedAt": 1699999999999,
      "stateVector": "<base64>"
    }

DELETE /notes/:id             # Soft delete (move to trash)
  Response:
    { "deletedAt": 1699999999999 }

POST   /notes/:id/restore     # Restore from trash
  Response:
    { "restoredAt": 1699999999999 }

DELETE /notes/:id/permanent   # Permanent delete
  Response:
    { "success": true }

Sync
POST   /sync/push             # Push Yjs updates to server
  Request:
    {
      "updates": [
        {
          "noteId": "01HXK5...",
          "update": "<base64-yjs-update>",
          "timestamp": 1699999999999
        }
      ]
    }
  Response:
    {
      "processed": ["01HXK5..."],
      "conflicts": [],  # Should be empty with CRDTs
      "serverTime": 1699999999999
    }

POST   /sync/pull             # Pull missing updates from server
  Request:
    {
      "stateVectors": {
        "01HXK5...": "<base64-state-vector>",
        "01HXK6...": "<base64-state-vector>"
      },
      "since": 1699999999999  # For new notes
    }
  Response:
    {
      "updates": {
        "01HXK5...": ["<base64-update-1>", "<base64-update-2>"],
        "01HXK6...": ["<base64-update-1>"]
      },
      "newNotes": [
        {
          "id": "01HXK7...",
          "title": "New Note from Web",
          "content": "<base64-yjs-doc>",
          "starred": false,
          "createdAt": 1699999999999
        }
      ],
      "deletedNotes": ["01HXK8..."],
      "serverTime": 1699999999999
    }

WebSocket /sync/live          # Real-time sync connection
  # Client → Server messages:
  { "type": "subscribe", "noteIds": ["01HXK5..."] }
  { "type": "update", "noteId": "01HXK5...", "update": "<base64>" }
  { "type": "ping" }
  
  # Server → Client messages:
  { "type": "update", "noteId": "01HXK5...", "update": "<base64>" }
  { "type": "noteCreated", "note": { ... } }
  { "type": "noteDeleted", "noteId": "01HXK5..." }
  { "type": "pong" }

User
GET    /user/me               # Get current user profile
  Response:
    {
      "id": "user_...",
      "email": "user@gmail.com",
      "name": "Paolo",
      "picture": "https://...",
      "createdAt": 1699999999999,
      "settings": {
        "fontSize": 16,
        "sidebarWidth": 280
      }
    }

PATCH  /user/settings         # Update user settings
  Request:
    { "fontSize": 18, "sidebarWidth": 300 }
  Response:
    { "settings": { ... } }

Error Responses
{
  "error": {
    "code": "NOTE_NOT_FOUND",
    "message": "The requested note does not exist",
    "details": {}
  }
}

HTTP Code	Error Code	Description
400	INVALID_REQUEST	Malformed request body
401	UNAUTHORIZED	Missing or invalid token
403	FORBIDDEN	No access to resource
404	NOTE_NOT_FOUND	Note doesn't exist
409	VERSION_CONFLICT	Optimistic lock failure
429	RATE_LIMITED	Too many requests
500	INTERNAL_ERROR	Server error
Database Schema (PostgreSQL)
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture_url TEXT,
    google_id VARCHAR(255) UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL DEFAULT '',
    content BYTEA NOT NULL,  -- Yjs document binary
    state_vector BYTEA,      -- For sync optimization
    starred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,  -- Soft delete
    version INTEGER DEFAULT 1
);

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_updated_at ON notes(updated_at);
CREATE INDEX idx_notes_deleted_at ON notes(deleted_at) WHERE deleted_at IS NOT NULL;

-- Sync updates log (for clients catching up)
CREATE TABLE sync_updates (
    id BIGSERIAL PRIMARY KEY,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    update_data BYTEA NOT NULL,
    client_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_updates_note_id ON sync_updates(note_id);
CREATE INDEX idx_sync_updates_created_at ON sync_updates(created_at);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Cleanup job: Delete notes in trash > 90 days
-- Run daily via pg_cron or external scheduler
CREATE OR REPLACE FUNCTION cleanup_deleted_notes() RETURNS void AS $$
BEGIN
    DELETE FROM notes 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

Development Phases
Phase 1: Desktop MVP (Weeks 1-4)
Week 1: Project Setup

Initialize Tauri 2.0 project with Rust backend
Set up SolidJS frontend with TypeScript
Configure TipTap editor with basic extensions
Implement dark theme and basic layout
Set up monorepo with Turborepo
Week 2: Core Editor

Implement checkbox extension with strikethrough styling
Add bullet lists with multi-level indentation
Add numbered lists with multi-level indentation
Headers (H1, H2, H3)
Bold and underline formatting
Font size zoom controls (Ctrl+/-, persisted)
Week 3: Local Storage

Integrate Yjs for document state management
SQLite database for note index and metadata
File-based storage for Yjs documents
Auto-save with 5-10 second debouncing
Full-text search with SQLite FTS5
Week 4: Note Management

Sidebar with note list (sorted by updated date)
Star/unstar functionality with shortcuts section
Trash with 90-day retention
Note creation and deletion
Search by title (Ctrl+F) and body (Ctrl+Shift+F)
Windows installer creation
Phase 2: Server & Sync (Weeks 5-8)
Week 5: API Server Setup

Rust/Axum server scaffold
PostgreSQL schema and migrations
Docker Compose for local development
Basic health check and logging
Week 6: Authentication

Google OAuth 2.0 integration
JWT generation and validation
Refresh token rotation
User creation and management
Week 7: Core API

Note CRUD endpoints
Sync push/pull endpoints
Yjs server-side document handling
Week 8: Real-time Sync

WebSocket server implementation
Redis pub/sub for multi-instance support
Desktop app sync integration
Offline → online transition handling
Comprehensive sync testing
Phase 3: Web Application (Weeks 9-11)
Week 9: Web App Setup

SolidJS web project (shared components with desktop)
Vite build configuration
Routing (SolidJS Router)
Authentication flow with Google
Week 10: Feature Parity

Full editor functionality
Note management (create, delete, star)
Search functionality
Real-time sync integration
IndexedDB for offline caching
Week 11: Polish

Responsive design (mobile-friendly)
Performance optimization
Cross-browser testing (Chrome, Firefox, Safari, Edge)
Loading states and error handling
Phase 4: Polish & Release (Week 12)
Windows installer (MSI via WiX or NSIS)
Application icon and branding assets
Landing page for pdtodo.com
User documentation
Beta testing program
Performance benchmarking
Future: Phase 5 - Android App
Kotlin with Jetpack Compose
Yjs integration via JavaScript bridge or native port
SQLite local storage
Same sync protocol as desktop/web
Project Structure
pdtodo/
├── apps/
│   ├── desktop/                    # Tauri desktop application
│   │   ├── src/                    # Frontend source (SolidJS)
│   │   │   ├── components/
│   │   │   │   ├── Editor/
│   │   │   │   ├── Sidebar/
│   │   │   │   ├── NoteList/
│   │   │   │   └── Search/
│   │   │   ├── stores/             # SolidJS stores
│   │   │   ├── hooks/
│   │   │   ├── styles/
│   │   │   ├── App.tsx
│   │   │   └── index.tsx
│   │   ├── src-tauri/              # Rust backend
│   │   │   ├── src/
│   │   │   │   ├── main.rs
│   │   │   │   ├── commands/       # Tauri commands
│   │   │   │   ├── storage/        # SQLite + file ops
│   │   │   │   └── sync/           # Sync logic
│   │   │   ├── Cargo.toml
│   │   │   └── tauri.conf.json
│   │   ├── index.html
│   │   └── package.json
│   │
│   ├── web/                        # Web application
│   │   ├── src/
│   │   │   ├── components/         # Web-specific components
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Notes.tsx
│   │   │   │   └── Settings.tsx
│   │   │   ├── App.tsx
│   │   │   └── index.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                        # Backend API server
│       ├── src/
│       │   ├── main.rs
│       │   ├── routes/
│       │   │   ├── auth.rs
│       │   │   ├── notes.rs
│       │   │   ├── sync.rs
│       │   │   └── user.rs
│       │   ├── handlers/
│       │   ├── models/
│       │   ├── db/
│       │   ├── sync/               # Yjs server handling
│       │   └── auth/               # JWT, OAuth
│       ├── migrations/
│       ├── Cargo.toml
│       └── Dockerfile
│
├── packages/
│   ├── ui/                         # Shared UI components
│   │   ├── src/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── editor/                     # TipTap editor configuration
│   │   ├── src/
│   │   │   ├── extensions/
│   │   │   │   ├── Checkbox.ts
│   │   │   │   ├── BulletList.ts
│   │   │   │   └── ...
│   │   │   ├── Editor.tsx
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── sync/                       # Yjs sync utilities
│   │   ├── src/
│   │   │   ├── provider.ts
│   │   │   ├── storage.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── types/                      # Shared TypeScript types
│       ├── src/
│       │   ├── note.ts
│       │   ├── user.ts
│       │   ├── sync.ts
│       │   └── index.ts
│       └── package.json
│
├── docker/
│   ├── docker-compose.yml          # Local dev environment
│   ├── docker-compose.prod.yml
│   └── nginx.conf
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── deployment.md
│
├── scripts/
│   ├── setup.sh
│   └── build-all.sh
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
│
├── turbo.json                      # Turborepo configuration
├── pnpm-workspace.yaml
├── package.json
└── README.md

Performance Targets
Metric	Target	Implementation
App startup	< 500ms	Tauri native, lazy loading, no Chromium
Note open	< 50ms	SQLite index, memory-cached Yjs docs
Typing latency	< 16ms (60fps)	SolidJS fine-grained reactivity
Auto-save trigger	5-10 seconds	Debounced, after last keystroke
Save operation	< 100ms	Async Rust file I/O
Search (10k notes)	< 100ms	SQLite FTS5 full-text search
Sync update size	< 1KB typical	Yjs binary delta encoding
Memory usage	< 100MB	No bundled Chromium
Bundle size	< 20MB	Tauri + minimal dependencies
Security Considerations
Authentication
OAuth 2.0 with PKCE for public clients
JWT with short expiry (1 hour)
Refresh token rotation (single use)
Secure token storage (OS keychain on desktop)
Data Protection
HTTPS/TLS for all API communication
WebSocket over WSS only
Local data optionally encrypted at rest (future)
No sensitive data in logs
API Security
Rate limiting (100 req/min per user)
Input validation on all endpoints
CORS restricted to pdtodo.com origins
SQL injection prevention (parameterized queries)
Deployment Architecture
                                    ┌─────────────────┐
                                    │   Cloudflare    │
                                    │      DNS        │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
           │  pdtodo.com   │       │api.pdtodo.com │       │  Static CDN   │
           │  (Web App)    │       │  (API Server) │       │   (Assets)    │
           │               │       │               │       │               │
           │  Cloudflare   │       │   Railway /   │       │  Cloudflare   │
           │    Pages      │       │   Fly.io      │       │    R2         │
           └───────────────┘       └───────┬───────┘       └───────────────┘
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                              ▼                         ▼
                    ┌───────────────┐         ┌───────────────┐
                    │  PostgreSQL   │         │    Redis      │
                    │   (Neon /     │         │  (Upstash)    │
                    │   Supabase)   │         │               │
                    └───────────────┘         └───────────────┘

Icon & Branding Assets Needed
App Icon (multiple sizes)

16x16, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512, 1024x1024
ICO format for Windows
PNG format for web
Tray Icon (if system tray is implemented)

16x16, 32x32 (light and dark variants)
Splash/Loading (optional)

Simple branded loading indicator
Favicon

favicon.ico (multi-size)
apple-touch-icon.png (180x180)
Social/Meta

og-image.png (1200x630) for link previews
Next Steps
Ready to begin implementation. Recommended order:

Initialize monorepo - Turborepo + pnpm workspace
Create Tauri desktop app - Basic window with SolidJS
Implement TipTap editor - All formatting features
Build local storage - SQLite + Yjs persistence
Complete desktop MVP - Full offline functionality