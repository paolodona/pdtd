# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PDTodo is a minimalist, offline-first note-taking application with CRDT-based synchronization. It uses a pnpm monorepo with Turbo for task orchestration.

See `FEATURES.md` for complete product specification and feature documentation.
See `DESIGN.md` for complete design and UI/UX guidelines

## Common Commands

```bash
# Install dependencies
pnpm install

# Start Docker services (PostgreSQL, Redis)
docker-compose -f docker/docker-compose.yml up -d postgres redis

# Development - run all apps
pnpm dev

# Run specific apps
pnpm desktop    # Desktop app (Tauri)
pnpm web        # Web app
pnpm api        # API server

# Build all packages
pnpm build

# Linting (TypeScript type checking)
pnpm lint

# Format code
pnpm format

# Desktop-specific commands
cd apps/desktop
pnpm tauri dev      # Development
pnpm tauri build    # Production build

# API server (Rust)
cd apps/api
cargo run           # Development
cargo build --release
```

## Architecture

**Tech Stack:**
- Desktop: Tauri 2.0 (Rust) + SolidJS + TipTap + Yjs
- Web: SolidJS + TipTap + Yjs
- API: Rust + Axum + PostgreSQL + Redis
- Sync: Yjs CRDTs for conflict-free real-time collaboration

**Monorepo Structure:**
```
apps/
  desktop/          # Tauri desktop app
    src/            # SolidJS frontend
    src-tauri/      # Rust backend (SQLite, sync, handlers)
  web/              # Web application
  api/              # Rust API server (Axum)
packages/
  editor/           # TipTap editor configuration
  sync/             # Yjs synchronization utilities
  types/            # Shared TypeScript types
  ui/               # Shared UI components
```

**Key Patterns:**
- Offline-first: Local SQLite + Yjs documents, syncs when online
- CRDT sync: Binary Yjs updates for conflict-free merging
- Three-tier desktop: SolidJS presentation → Solid stores → Tauri/Rust commands
- Shared packages: `@pdtodo/editor`, `@pdtodo/sync`, `@pdtodo/types`, `@pdtodo/ui`

**Data Storage Paths:**
- Windows: `%APPDATA%/pdtodo/`
- macOS: `~/Library/Application Support/pdtodo/`
- Linux: `~/.local/share/pdtodo/`

## Design System

Reference `DESIGN.md` for UI guidelines. Key points:
- Dark theme: Background `#111214`, accent blue `#3B82F6`, accent yellow `#FACC15`
- Three-panel layout: Top bar, left sidebar (260-300px), right detail pane
- Base spacing unit: 4px
- Typography: System sans-serif, note titles 24-28px bold, body 14-15px

## Slash Commands

- `/create-plan` - Create implementation plan, saves to `.agent_session/plan.md`
- `/implement-plan` - Execute plan from `.agent_session/plan.md` using TodoWrite
- `/review-session` - Summarize session state from `.agent_session/`

## Environment Variables (API Server)

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT tokens
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth2
