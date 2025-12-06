# PDTodo Product Features

PDTodo is a minimalist, offline-first note-taking application designed for distraction-free productivity. It prioritizes keyboard-driven workflows, automatic synchronization, and a clean dark interface.

**Available Platforms:**
- Desktop (Windows, macOS, Linux)
- Web
- API (for integrations)

---

## Core Features

These features are shared across all platforms unless otherwise noted.

### Note Management

- **Create Notes**: New notes are created with the default title "Untitled" and are immediately selected for editing.
- **Edit Notes**: Both the title and content are editable. Changes are auto-saved after a brief delay.
- **Soft Delete**: Deleted notes are moved to trash and can be recovered.
- **Restore**: Notes in trash can be restored to the active notes list.
- **Permanent Delete**: Notes can be permanently removed from trash.
- **Duplicate**: Creates a copy of the selected note with "(copy)" appended to the title.
- **Star/Favorite**: Notes can be starred for quick access in the Shortcuts section.

### Sidebar

The sidebar provides navigation and organization for all notes.

**Search**
- Real-time filtering as you type
- Filters by note title (case-insensitive)
- Shows "No matching notes" when no results found
- Clear button (X) appears when text is entered

**New Note Button**
- Full-width blue accent button at top of sidebar
- Creates a new note and selects it immediately

**Scratch Pad**
- A permanent note that always appears at the top of the sidebar
- Cannot be deleted or moved to trash
- Cannot be starred/favorited
- Title is fixed as "Scratch Pad" and cannot be edited
- Uses a pencil icon with yellow accent color
- Intended for quick temporary notes and ideas

**Shortcuts Section**
- Displays all starred/favorited notes
- Only visible when at least one note is starred
- Section header: "SHORTCUTS" (uppercase, muted text)

**All Notes Section**
- Displays all active (non-deleted) notes
- Sorted by last updated date (newest first)
- Section header: "ALL NOTES" (uppercase, muted text)

**Trash Section**
- Collapsible section showing soft-deleted notes
- Only visible when at least one note is in trash
- Section header: "TRASH" with expand/collapse toggle
- Trashed notes appear with reduced opacity
- Trashed notes cannot be edited

### Note List Items

Each note in the sidebar displays:

**Visual Elements**
- Note icon (document icon, or pencil for Scratch Pad)
- Note title (truncated with ellipsis if too long)
- Falls back to "Untitled" if title is empty

**Date Display**
- Today: Shows time in HH:MM format
- Yesterday: Shows "Yesterday"
- Within last 7 days: Shows weekday abbreviation (Mon, Tue, etc.)
- Older: Shows "Mon DD" format

**Selection State**
- Selected note has highlighted background
- Blue accent border on left side (3px)

**Action Buttons** (appear on hover)
- **Star**: Toggle favorite status. Yellow filled when starred, outline when not.
- **Delete**: Opens confirmation modal before moving to trash.

**Delete Confirmation Modal**
- Shows note title
- Message: "This note will be moved to trash."
- Cancel and Delete buttons
- Delete button uses red/danger color

---

## Editor

### Toolbar

The toolbar is positioned at the top of the editor area with no border, blending seamlessly with the content area. Buttons are 32x32px with icon-only display.

**Text Formatting**
- **Bold** (B icon) - Keyboard: Ctrl+B
- **Underline** (U icon) - Keyboard: Ctrl+U

**Headings**
- **H1** - Keyboard: Ctrl+1
- **H2** - Keyboard: Ctrl+2
- **H3** - Keyboard: Ctrl+3

**Lists**
- **Bullet List** - Keyboard: Ctrl+Shift+8
- **Numbered List** - Keyboard: Ctrl+Shift+7
- **Task List** (checkbox icon) - Keyboard: Ctrl+Shift+9

**Indentation**
- **Indent** (right arrow icon) - Keyboard: Tab
- **Outdent** (left arrow icon) - Keyboard: Shift+Tab

**Links**
- **Link** (chain icon) - Keyboard: Ctrl+K
- Opens prompt for URL entry
- Clicking when link is active removes the link

**Button States**
- Active formatting shows blue background with white icon
- Buttons grouped with vertical dividers between groups

### Note Header

**Title Field**
- Large editable text field (28px bold)
- Placeholder text "Untitled" when empty
- Pressing Enter moves focus to the editor content area

**Timestamp**
- Displays below the title in muted text
- Format: "25th of January 2026 at 2:30 PM"
- Uses ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)

### Content Area

- Rich text editor powered by TipTap
- Placeholder text "Start typing..." when empty
- Maximum content width of 800px for readability
- Scrolls independently from sidebar
- Generous bottom padding for comfortable scrolling

---

## Task Lists / Checkboxes

This section defines the complete behavior specification for task lists. Use this as the reference when implementing task lists on any platform.

### Visual Appearance

**Checkbox**
- Size: 16x16 pixels
- Unchecked: Medium gray outline (#6B7280), dark background
- Checked: Green fill (#22C55E) with white checkmark
- Hover: Green border highlight

**Task Text**
- Unchecked: Normal text color
- Checked: Strikethrough decoration with dimmed/muted color

**Spacing**
- Gap between checkbox and text: 8px
- Vertical margin between items: 3px
- Minimum item height: 22px

### Keyboard Behavior

| Key | Action |
|-----|--------|
| **Enter** | Creates a new task item below the current one. Important: This creates a new list item, NOT a paragraph inside the current item. |
| **Tab** | Indents the current task item, creating a nested sub-task |
| **Shift+Tab** | Outdents the current task item, moving it up one nesting level |
| **Ctrl+Enter** (or Cmd+Enter on Mac) | Toggles the checkbox checked/unchecked state |
| **Backspace** (on empty item) | Removes the empty task item |

### Nesting

- Task lists support unlimited nesting levels
- Each nested level indents by 24px (1.5rem)
- Nested task lists have 8px top margin from parent
- Child tasks inherit the list structure and behaviors

### Conversion

- Converting a task list toggles back to normal paragraph
- Re-applying task list converts paragraphs to task items

---

## Links

### Auto-Linking
- URLs are automatically detected while typing
- Detected URLs are converted to clickable links

### Paste Behavior
- Pasting a URL automatically creates a link

### Click Behavior
- Clicking a link opens it in the external browser
- Links do NOT navigate within the app

### Manual Link Creation
- Use Ctrl+K or the toolbar link button
- Prompts for URL entry
- Clicking the link button when already on a link removes the link

### Styling
- Links display in blue accent color (#3B82F6)
- Links have underline decoration
- Security attributes applied: rel="noopener noreferrer nofollow"

---

## Keyboard Shortcuts

### Global Application Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+N | Create new note |
| Ctrl+Delete | Delete selected note (move to trash) |
| Ctrl+Shift+D | Duplicate selected note |
| Ctrl++ or Ctrl+= | Increase font size |
| Ctrl+- | Decrease font size |
| Ctrl+0 | Reset font size to default (16px) |

### Editor Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+B | Toggle bold |
| Ctrl+U | Toggle underline |
| Ctrl+1 | Toggle Heading 1 |
| Ctrl+2 | Toggle Heading 2 |
| Ctrl+3 | Toggle Heading 3 |
| Ctrl+Shift+7 | Toggle numbered list |
| Ctrl+Shift+8 | Toggle bullet list |
| Ctrl+Shift+9 | Toggle task list |
| Tab | Indent list item |
| Shift+Tab | Outdent list item |
| Ctrl+Enter | Toggle task checkbox |
| Ctrl+K | Insert/edit link |

---

## Settings

### Font Size
- Adjustable range: 12px to 24px
- Default: 16px
- Increments by 2px per adjustment
- Persisted across sessions

### Sidebar Width
- Adjustable range: 200px to 400px
- Default: 280px
- Persisted across sessions

### Theme
- Dark theme (default and currently only option)
- Light and System themes planned for future

---

## Synchronization

### Offline-First
- All notes are saved locally immediately
- Application works fully without internet connection
- No data loss when offline

### Auto-Save
- Changes are automatically saved after a 1-second debounce delay
- Pending saves are flushed before switching notes
- Save indicator shows "Saving..." during save operation

### CRDT Sync
- Uses Yjs for conflict-free collaborative editing
- Multiple devices can edit the same note without conflicts
- Changes are merged automatically when reconnected

### Sync Status
- Disconnected: No server connection
- Connecting: Establishing connection
- Connected: Ready to sync
- Syncing: Actively transferring data
- Synced: All changes saved to server

---

## Empty States

### No Notes
- Message: "No notes yet"
- Shows "Create your first note" button
- Displayed when note list is completely empty

### No Note Selected
- Message: "Select a note or create a new one"
- Displayed in editor area when no note is selected

### No Search Results
- Message: "No matching notes"
- Displayed when search filter returns no results

---

## Desktop-Specific Features

### Custom Titlebar
- Custom draggable titlebar (replaces native window chrome)
- Left side: App title "pdtodo"
- Right side: Minimize, Maximize, Close buttons
- Close button has red hover highlight
- Double-click titlebar toggles maximize/restore
- Drag titlebar background to move window

### Local Data Storage
- **Metadata**: SQLite database (pdtodo.db)
- **Content**: Binary Yjs files in notes/ directory
- **Locations**:
  - Windows: `%APPDATA%/pdtodo/`
  - macOS: `~/Library/Application Support/pdtodo/`
  - Linux: `~/.local/share/pdtodo/`

### Full-Text Search
- Uses SQLite FTS5 for fast local search
- Indexes note titles for instant search results

---

## Web-Specific Features

### Authentication
- Google OAuth2 login
- Access tokens expire after 1 hour (auto-refreshed)
- Refresh tokens expire after 30 days
- Session persisted in browser localStorage
- Logout clears all tokens

### Settings Page
- Display user profile (email, name from Google account)
- Theme selector (Dark only, Light/System coming soon)
- Font size adjustment slider
- App version information
- Sign out button

### Cloud Sync
- Notes synced to server via API
- Real-time updates via WebSocket when available
- Falls back to HTTP push/pull when WebSocket unavailable

---

## API Features

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/google` | POST | Exchange Google OAuth code for access and refresh tokens |
| `/auth/refresh` | POST | Exchange refresh token for new access token |
| `/auth/logout` | POST | Invalidate refresh token |

### Note Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notes` | GET | List all notes. Supports `includeDeleted` and `since` query parameters |
| `/notes` | POST | Create a new note |
| `/notes/:id` | GET | Get a single note with full content |
| `/notes/:id` | PUT | Update note title, content, or starred status |
| `/notes/:id` | DELETE | Soft delete (move to trash) |
| `/notes/:id/restore` | POST | Restore note from trash |
| `/notes/:id/permanent` | DELETE | Permanently delete note |

### Synchronization Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sync/push` | POST | Push local updates to server |
| `/sync/pull` | POST | Pull server updates using state vectors |
| `/sync/live` | GET | WebSocket connection for real-time updates |

### User Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/user/me` | GET | Get current authenticated user profile |
| `/user/settings` | PATCH | Update user settings |

---

## Design System Reference

For visual specifications including colors, typography, and spacing, see **DESIGN.md**.

Key design values:
- **Background**: #111214 (primary), #18191c (sidebar)
- **Accent Blue**: #3B82F6
- **Accent Yellow**: #FACC15
- **Success Green**: #22C55E
- **Danger Red**: #EF4444
- **Base spacing unit**: 4px
