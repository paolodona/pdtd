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
Implementation Status
As of December 2024, the following phases have been completed:

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Desktop MVP | ✅ COMPLETE | Full offline-first desktop app with TipTap editor |
| Phase 2: Server & Sync | 🟡 MOSTLY COMPLETE | API server running, WebSocket real-time sync not fully connected |
| Phase 3: Web Application | 🟡 MOSTLY COMPLETE | Full web app with auth, missing real-time sync |
| Phase 4: Polish & Release | 🔄 IN PROGRESS | Basic functionality complete, installer pending |
| Phase 5: Android App | ⬜ NOT STARTED | Future milestone |

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
Scratch Pad Feature [IMPLEMENTED]
The Scratch Pad is a special permanent note that serves as a quick capture area:

- **Fixed ID**: `"scratch-pad"` (not a UUID)
- **Always visible**: Appears at the top of the sidebar, above Shortcuts
- **Non-deletable**: Cannot be moved to trash or permanently deleted
- **Non-starrable**: Cannot be added to Shortcuts section
- **Fixed title**: Title is always "Scratch Pad" and cannot be edited
- **Visual distinction**: Uses a pencil icon with yellow accent color
- **Auto-created**: Storage layer ensures Scratch Pad exists on initialization

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

Desktop Application Design [IMPLEMENTED]
Component Architecture
The desktop frontend is built with SolidJS and organized as follows:

**Main Components** (`apps/desktop/src/components/`):
- `App.tsx` - Root component, orchestrates layout and keyboard shortcuts
- `TitleBar.tsx` - Custom Tauri window controls (minimize, maximize, close)
- `DropdownMenu.tsx` - Hamburger menu with About, Shortcuts, Logs options
- `Sidebar.tsx` - Note navigation with search, sections, and note list
- `Editor.tsx` - TipTap editor with toolbar, title field, and content area
- `NoteItem.tsx` - Individual note in sidebar with actions (star, delete)
- `SearchInput.tsx` - Reusable search input component with highlighting
- `AboutOverlay.tsx` - About dialog showing app info and configuration
- `ShortcutsModal.tsx` - Keyboard shortcuts reference modal
- `LinkTooltip.tsx` - Tooltip for opening links on hover

**State Management** (`apps/desktop/src/stores/`):
- `notesStore.ts` - Note CRUD operations, selection, search filtering
- `settingsStore.ts` - User preferences (fontSize, sidebarWidth, theme, allNotesExpanded, trashExpanded, lastOpenedNoteId, apiServerUrl)

**Hooks** (`apps/desktop/src/hooks/`):
- `useKeyboardShortcuts.ts` - Global keyboard shortcut handler

**Tauri Commands** (`apps/desktop/src-tauri/src/commands/`):
- Note CRUD: `get_notes`, `get_note`, `create_note`, `update_note_*`, `delete_note`, etc.
- Search: `search_notes` (FTS5)
- Utilities: `fetch_url_title`, `open_url` (shell open for links)
- Logging: `get_logs`, `clear_logs` (application logging)

**Storage** (`apps/desktop/src-tauri/src/storage/`):
- SQLite database for metadata and FTS5 index
- Binary `.yjs` files for Yjs document content
- Automatic Scratch Pad creation on init

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
Ctrl+F	Focus search input
Ctrl+Shift+F	Search in note body
Ctrl+S	Force save (auto-saves anyway)
Ctrl+Z	Undo (Yjs-aware)
Ctrl+Y / Ctrl+Shift+Z	Redo (Yjs-aware)
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
Ctrl+K	Insert/edit link
Ctrl+Click	Open link in browser
Ctrl+Delete	Move note to trash
Ctrl+Shift+D	Duplicate note
Ctrl+,	Open settings
Escape	Close search / deselect
API Specification [IMPLEMENTED]
Base URL
Production: https://api.pdtodo.com
Development: http://localhost:3000
Authentication
All API requests (except /auth/*) require a valid JWT token in the Authorization header:

Authorization: Bearer <jwt_token>

Endpoints
Authentication [IMPLEMENTED]
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

Notes [IMPLEMENTED]
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

Sync [PARTIAL - WebSocket not fully connected]
POST   /sync/push             # Push Yjs updates to server [IMPLEMENTED]
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

POST   /sync/pull             # Pull missing updates from server [IMPLEMENTED]
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

WebSocket /sync/live          # Real-time sync connection [DECLARED - handler exists, broadcast not implemented]
  # Client → Server messages:
  { "type": "subscribe", "noteIds": ["01HXK5..."] }
  { "type": "update", "noteId": "01HXK5...", "update": "<base64>" }
  { "type": "ping" }
  
  # Server → Client messages:
  { "type": "update", "noteId": "01HXK5...", "update": "<base64>" }
  { "type": "noteCreated", "note": { ... } }
  { "type": "noteDeleted", "noteId": "01HXK5..." }
  { "type": "pong" }

User [IMPLEMENTED]
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
Phase 1: Desktop MVP ✅ COMPLETE
Week 1: Project Setup ✅

Initialize Tauri 2.0 project with Rust backend
Set up SolidJS frontend with TypeScript
Configure TipTap editor with basic extensions
Implement dark theme and basic layout
Set up monorepo with Turborepo
Week 2: Core Editor ✅

Implement checkbox extension with strikethrough styling
Add bullet lists with multi-level indentation
Add numbered lists with multi-level indentation
Headers (H1, H2, H3)
Bold and underline formatting
Font size zoom controls (Ctrl+/-, persisted)
Week 3: Local Storage ✅

Integrate Yjs for document state management
SQLite database for note index and metadata
File-based storage for Yjs documents
Auto-save with 5-10 second debouncing
Full-text search with SQLite FTS5
Week 4: Note Management ✅

Sidebar with note list (sorted by updated date)
Star/unstar functionality with shortcuts section
Trash with 90-day retention
Note creation and deletion
Search by title (Ctrl+F) and body (Ctrl+Shift+F)
Windows installer creation (pending)
Phase 2: Server & Sync 🟡 MOSTLY COMPLETE
Week 5: API Server Setup ✅

Rust/Axum server scaffold
PostgreSQL schema and migrations
Docker Compose for local development
Basic health check and logging
Week 6: Authentication ✅

Google OAuth 2.0 integration
JWT generation and validation
Refresh token rotation
User creation and management
Week 7: Core API ✅

Note CRUD endpoints
Sync push/pull endpoints
Yjs server-side document handling
Week 8: Real-time Sync 🟡 PARTIAL

WebSocket server implementation (handler declared, broadcast not complete)
Redis pub/sub for multi-instance support (pending)
Desktop app sync integration (pending)
Offline → online transition handling (pending)
Comprehensive sync testing (pending)
Phase 3: Web Application 🟡 MOSTLY COMPLETE
Week 9: Web App Setup ✅

SolidJS web project (shared components with desktop)
Vite build configuration
Routing (SolidJS Router)
Authentication flow with Google
Week 10: Feature Parity ✅

Full editor functionality
Note management (create, delete, star)
Search functionality
Real-time sync integration (pending - uses HTTP push/pull)
IndexedDB for offline caching (pending)
Week 11: Polish 🟡 PARTIAL

Responsive design (mobile-friendly)
Performance optimization
Cross-browser testing (Chrome, Firefox, Safari, Edge)
Loading states and error handling
Phase 4: Polish & Release ⬜ PLANNED
Windows installer (MSI via WiX or NSIS)
Application icon and branding assets
Landing page for pdtodo.com
User documentation
Beta testing program
Performance benchmarking
Future: Phase 5 - Android App ⬜ PLANNED
Kotlin with Jetpack Compose
Yjs integration via JavaScript bridge or native port
SQLite local storage
Same sync protocol as desktop/web
Project Structure [IMPLEMENTED - Actual Structure]
pdtodo/
├── apps/
│   ├── desktop/                    # Tauri desktop application ✅
│   │   ├── src/                    # Frontend source (SolidJS)
│   │   │   ├── components/         # UI Components
│   │   │   │   ├── App.tsx         # Root layout component
│   │   │   │   ├── TitleBar.tsx    # Custom window controls
│   │   │   │   ├── DropdownMenu.tsx # Hamburger menu (About, Shortcuts, Logs)
│   │   │   │   ├── Sidebar.tsx     # Note navigation panel
│   │   │   │   ├── Editor.tsx      # TipTap editor with toolbar
│   │   │   │   ├── NoteItem.tsx    # Note list item
│   │   │   │   ├── SearchInput.tsx # Search component with highlighting
│   │   │   │   ├── AboutOverlay.tsx # About dialog
│   │   │   │   ├── ShortcutsModal.tsx # Keyboard shortcuts reference
│   │   │   │   └── LinkTooltip.tsx # Link tooltip for opening URLs
│   │   │   ├── stores/             # SolidJS stores
│   │   │   │   ├── notesStore.ts   # Note CRUD, selection, filtering
│   │   │   │   └── settingsStore.ts # User preferences
│   │   │   ├── hooks/
│   │   │   │   └── useKeyboardShortcuts.ts
│   │   │   ├── styles/
│   │   │   │   └── index.css       # Global styles
│   │   │   └── index.tsx           # Entry point
│   │   ├── src-tauri/              # Rust backend
│   │   │   ├── src/
│   │   │   │   ├── main.rs         # Tauri app setup
│   │   │   │   ├── lib.rs          # Library exports
│   │   │   │   ├── commands/       # Tauri IPC commands
│   │   │   │   │   └── mod.rs      # Note CRUD, search, fetch_url_title
│   │   │   │   └── storage/        # SQLite + file ops
│   │   │   │       └── mod.rs      # Storage implementation
│   │   │   ├── Cargo.toml
│   │   │   └── tauri.conf.json
│   │   ├── index.html
│   │   └── package.json
│   │
│   ├── web/                        # Web application ✅
│   │   ├── src/
│   │   │   ├── components/         # Web-specific components
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx       # Google OAuth login
│   │   │   │   ├── Notes.tsx       # Main notes page
│   │   │   │   └── Settings.tsx    # User settings
│   │   │   ├── stores/
│   │   │   │   ├── auth.ts         # Auth state, token management
│   │   │   │   └── notes.ts        # Note state, API integration
│   │   │   ├── lib/
│   │   │   │   └── api.ts          # API client with all endpoints
│   │   │   ├── App.tsx
│   │   │   └── index.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                        # Backend API server ✅
│       ├── src/
│       │   ├── main.rs             # Axum server setup
│       │   ├── routes/
│       │   │   ├── mod.rs          # Route registration
│       │   │   ├── auth.rs         # OAuth, JWT, refresh tokens
│       │   │   ├── notes.rs        # Note CRUD endpoints
│       │   │   ├── sync.rs         # Push/pull sync, WebSocket
│       │   │   └── user.rs         # User profile, settings
│       │   ├── db/
│       │   │   └── mod.rs          # Database operations
│       │   └── auth/
│       │       └── mod.rs          # JWT extraction, validation
│       ├── migrations/             # SQLx migrations
│       ├── Cargo.toml
│       └── Dockerfile
│
├── packages/
│   ├── ui/                         # Shared UI components ✅
│   │   ├── src/
│   │   │   ├── Button.tsx          # Button variants (primary, secondary, ghost, danger)
│   │   │   ├── Input.tsx           # Text input with error state
│   │   │   ├── Modal.tsx           # Portal-based modal
│   │   │   ├── Icon.tsx            # SVG icon system
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── editor/                     # TipTap editor configuration ✅
│   │   ├── src/
│   │   │   ├── editorConfig.ts     # Extension configuration
│   │   │   ├── TaskItemExtended.ts # Custom task item extension
│   │   │   ├── editorStyles.ts     # CSS styles
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── sync/                       # Yjs sync utilities ✅
│   │   ├── src/
│   │   │   ├── document.ts         # Yjs document helpers
│   │   │   ├── provider.ts         # SyncProvider class
│   │   │   ├── storage.ts          # LocalStorage adapter
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── types/                      # Shared TypeScript types ✅
│       ├── src/
│       │   ├── note.ts             # Note, NoteMeta interfaces
│       │   ├── user.ts             # User, UserSettings
│       │   ├── sync.ts             # SyncUpdate, WebSocketMessage
│       │   ├── api.ts              # ApiError, AuthResponse
│       │   └── index.ts
│       └── package.json
│
├── docker/
│   └── docker-compose.yml          # PostgreSQL, Redis
│
├── turbo.json                      # Turborepo configuration
├── pnpm-workspace.yaml
├── package.json
├── ARCHITECTURE.md                 # This file
├── FEATURES.md                     # Product features spec
├── DESIGN.md                       # UI/UX guidelines
├── CLAUDE.md                       # AI assistant instructions
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

Implementation Notes
This section documents implementation details that extend or differ from the original plan.

### TaskItemExtended Custom Extension
The task list implementation uses a custom TipTap extension (`TaskItemExtended`) with specific keyboard behaviors:
- **Enter**: Creates a new task item (not a paragraph inside the current item)
- **Tab**: Indents to create nested sub-tasks
- **Shift+Tab**: Outdents task item
- **Ctrl/Cmd+Enter**: Toggles checkbox checked/unchecked
- **Strikethrough**: Completed tasks show strikethrough text with muted color

### Package Exports
Each shared package exports specific utilities:

**@pdtodo/editor**:
- `getEditorExtensions(options?)` - Configured TipTap extensions
- `editorStyles` - CSS string for editor styling
- `TaskItemExtended` - Custom task item extension

**@pdtodo/sync**:
- Document helpers: `createNoteDocument`, `encodeDocument`, `decodeDocument`
- Metadata: `setNoteTitle`, `getNoteTitle`, `setNoteStarred`, `getNoteStarred`
- Sync: `getStateVector`, `getMissingUpdates`, `applyUpdate`, `mergeUpdates`
- `SyncProvider` class for WebSocket/HTTP sync
- `LocalStorage` class with debounced auto-save

**@pdtodo/types**:
- Note types: `Note`, `NoteMeta`, `CreateNoteInput`, `UpdateNoteInput`
- User types: `User`, `UserSettings`, `DEFAULT_USER_SETTINGS`
- Sync types: `SyncUpdate`, `SyncPushRequest/Response`, `SyncPullRequest/Response`
- API types: `ApiError`, `AuthResponse`, `ErrorCode`

**@pdtodo/ui**:
- Components: `Button`, `Input`, `Modal`, `Icon`
- Button variants: primary, secondary, ghost, danger
- Icon names: search, star, star-filled, trash, plus, folder, document, settings, menu, close, check

### Desktop Storage Implementation
The desktop app uses a hybrid storage approach:
- **SQLite database** (`pdtodo.db`): Note metadata, FTS5 search index
- **Binary files** (`notes/{id}.yjs`): Yjs document content
- **Automatic Scratch Pad**: Storage layer creates Scratch Pad on initialization if missing

### Web App Authentication Flow
1. User clicks "Sign in with Google"
2. Redirects to Google OAuth consent screen
3. Google redirects back with authorization code
4. Frontend exchanges code at `POST /auth/google`
5. Server validates with Google, creates/updates user, returns JWT
6. Access token (1 hour) stored in localStorage
7. Refresh token (30 days) used for automatic token refresh
8. Token refreshed 60 seconds before expiry

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
The core application is functional. Remaining work to reach production:

### High Priority (Complete Core Sync)
1. **Complete WebSocket real-time sync** - Connect SyncProvider to /sync/live endpoint
2. **Add Redis pub/sub** - Enable multi-instance server broadcasting
3. **Desktop ↔ Server sync** - Integrate desktop app with API server
4. **Offline queue for web** - Queue updates when offline, sync on reconnect

### Medium Priority (Polish)
5. **Light/System theme support** - Implement theme switching in settings
6. **Windows installer** - Create MSI via WiX or NSIS
7. **Performance optimization** - Lazy loading, bundle optimization
8. **Cross-browser testing** - Verify Chrome, Firefox, Safari, Edge

### Lower Priority (Launch)
9. **Landing page** - Create pdtodo.com marketing site
10. **User documentation** - Getting started guide, keyboard shortcuts reference
11. **Beta testing program** - Gather user feedback
12. **Application icons** - Design and export all required sizes

### Future (Phase 5)
13. **Android app** - Kotlin + Jetpack Compose with Yjs integration