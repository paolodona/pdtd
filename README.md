# PDTodo

A minimalist, lightning-fast, offline-first note-taking application with distributed synchronization capabilities.

## Features

- **Fast**: Sub-100ms startup, instant saves
- **Offline-First**: Full functionality without network
- **Conflict-Free Sync**: Automatic merging using CRDTs (Yjs)
- **Minimalist**: Clean UI, small footprint, low dependencies
- **Cross-Platform**: Desktop (Windows, macOS, Linux), Web, and mobile (future)

## Tech Stack

- **Desktop App**: Tauri 2.0 + Rust + SolidJS + TipTap
- **Web App**: SolidJS + TipTap + Yjs
- **API Server**: Rust + Axum
- **Database**: PostgreSQL + Redis
- **Sync**: Yjs (CRDTs) for conflict-free real-time collaboration

## Project Structure

```
pdtodo/
├── apps/
│   ├── desktop/          # Tauri desktop application
│   ├── web/              # Web application
│   └── api/              # Rust API server
├── packages/
│   ├── editor/           # TipTap editor configuration
│   ├── sync/             # Yjs sync utilities
│   ├── types/            # Shared TypeScript types
│   └── ui/               # Shared UI components
├── docker/               # Docker configuration
└── docs/                 # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Rust 1.70+ (for desktop app and API)
- Docker (for local development)

#### Installing Prerequisites

**Node.js 18+**
- Download from [nodejs.org](https://nodejs.org/) or use a version manager:
  ```bash
  # Using nvm (Linux/macOS)
  nvm install 18
  nvm use 18

  # Using nvm-windows (Windows)
  nvm install 18
  nvm use 18
  ```

**pnpm 8+**
```bash
# Using npm
npm install -g pnpm

# Or using Corepack (recommended, bundled with Node.js 16.13+)
corepack enable
corepack prepare pnpm@latest --activate
```

**Rust 1.70+**
- Install via [rustup](https://rustup.rs/):
  ```bash
  # Linux/macOS
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

  # Windows: Download and run rustup-init.exe from https://rustup.rs/
  ```
- After installation, ensure Rust is in your PATH and verify:
  ```bash
  rustc --version
  cargo --version
  ```

**Docker**
- Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for your OS
- Verify installation:
  ```bash
  docker --version
  docker-compose --version
  ```

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/pdtodo.git
cd pdtodo

# Install dependencies
pnpm install

# Start Docker services (PostgreSQL, Redis)
docker-compose -f docker/docker-compose.yml up -d postgres redis
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Run specific apps
pnpm desktop    # Desktop app with Tauri
pnpm web        # Web app
pnpm api        # API server

# Build all packages
pnpm build

# Run linting
pnpm lint
```

### Desktop App (Tauri)

```bash
cd apps/desktop

# Development
pnpm tauri dev

# Build for production
pnpm tauri build
```

### API Server

```bash
cd apps/api

# Development
cargo run

# Production build
cargo build --release
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New note |
| `Ctrl+F` | Search by title |
| `Ctrl+Shift+F` | Search in note body |
| `Ctrl++` / `Ctrl+=` | Increase font size |
| `Ctrl+-` | Decrease font size |
| `Ctrl+0` | Reset font size |
| `Ctrl+B` | Bold |
| `Ctrl+U` | Underline |
| `Ctrl+1/2/3` | Heading 1/2/3 |
| `Ctrl+Shift+7` | Numbered list |
| `Ctrl+Shift+8` | Bullet list |
| `Ctrl+Shift+9` | Checklist |
| `Ctrl+Enter` | Toggle checkbox |
| `Tab` | Indent list item |
| `Shift+Tab` | Outdent list item |
| `Ctrl+Delete` | Move note to trash |
| `Ctrl+Shift+D` | Duplicate note |

## Architecture

### Desktop App
- Uses system WebView (no bundled Chromium) for minimal footprint
- SQLite for local storage with full-text search
- Yjs documents stored as binary files
- Offline-first with automatic sync when online

### Sync Protocol
1. Local edits generate Yjs binary updates
2. Updates are queued locally (debounced save)
3. When online, updates push to server via REST/WebSocket
4. Server applies updates and broadcasts to other clients
5. CRDTs ensure conflict-free merging regardless of order

### Data Storage

```
%APPDATA%/pdtodo/          # Windows
~/Library/Application Support/pdtodo/  # macOS
~/.local/share/pdtodo/     # Linux

├── pdtodo.db              # SQLite database (index, metadata)
├── notes/
│   ├── {note-id}.yjs      # Yjs document state
│   └── ...
└── config.json            # User settings
```

## License

MIT
