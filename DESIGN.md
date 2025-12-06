## Overall Style

* **Theme**: Dark, minimal, productivity-focused.

* **Color palette**

  * Background main: near-black `#111214` – `#121316`
  * Secondary panels: very dark gray `#18191c` – `#1b1c1f`
  * Card background (selected note): slightly lighter gray `#202226`
  * Primary accent (buttons, links, key icons): blue (e.g. `#3B82F6`)
  * Secondary accent (stars, highlights): yellow/gold (e.g. `#FACC15`)
  * Text primary: off-white `#F9FAFB`
  * Text secondary: muted gray `#9CA3AF`
  * Borders/dividers: subtle gray `#27272f` (low contrast)
  * Checklist unchecked box: medium gray outline (`#6B7280`)
  * Checklist checked box: filled green (`#22C55E`) with white checkmark

* **Visual language**

  * Flat / very subtle shadows, no strong gradients.
  * Rounded corners (4–8px) on cards, buttons, and input fields.
  * Use lots of vertical spacing and padding for a calm, non-busy layout.

---

## Global Layout

Use a **three-panel app layout**:

1. **Top app bar**

   * Left: app name .
   * Center: nothing or current section title.
   * Right: user menu, and overflow menu.
   * Background: same as main background but with a subtle bottom divider line.

2. **Left sidebar**

   * Width: ~260–300px fixed.
   * Sections (in order):

     * Search bar at top with + New Note button.
     * **Scratch Pad**: A permanent, always-available note for quick notes (cannot be deleted or favorited).
     * "Shortcuts" list: starred/favorited notes with yellow star icons.
     * "All Notes" list: all active notes sorted by last updated.
     * "Trash" section (collapsible): soft-deleted notes.
   * Scrollable independently from the main content.

3. **Right pane (note detail)**

   * Fills remaining horizontal space.
   * **Header area** (no border, blends with body):
     * Toolbar row: formatting buttons (Bold, Underline, H1/H2/H3, lists, indent/outdent, link).
     * Title row: large editable note title + "Last updated" timestamp.
   * Body: full-height editor area with 24px padding around content.
   * Scrollable independently of left panes.

---

## Typography

* **Base font**: a clean sans serif (e.g. system font stack, Inter, SF Pro).
* **Sizes**

  * App / workspace title: 16–18px, bold.
  * Note title in detail: 24–28px, bold.
  * Section headings (“Shortcuts”, “Recent notes”, “TODO”, “MIT”): 13–14px, bold, tracking slightly increased.
  * Note titles in list: 14–16px, semi-bold.
  * Body text: 14–15px, normal.
  * Metadata (timestamp, notebook name): 12–13px, muted color.
* **Line height**: 1.4–1.6 for readability.

---

## Left Sidebar Details

* **Search bar**

  * Top of sidebar.
  * Full width.
  * Rounded input with left search icon.
  * Placeholder text in muted gray.

* **Primary shortcut button**

  * Example: **“+ Note”**.
  * Prominent, full width, accent background, white text.
  * Slight hover elevation or background lighten.

* **Shortcuts section**

  * Section label “Shortcuts” in all caps, small, muted.
  * Each shortcut: left icon + text label, medium weight.
  * Hover state: slightly lighter background row.

* **Recent notes**

  * Section title “Recent notes”.
  * Each item: small text with two lines (title + notebook name / snippet).

---

## Note Detail (Right Pane)

### Header / Toolbar

* Located at top of editor, no border (blends with body).
* **Toolbar row**: 32x32px buttons with icons, grouped with dividers:
  * Text formatting: Bold (B), Underline (U)
  * Headings: H1, H2, H3
  * Lists: Bullet list, Numbered list, Task list (checkbox)
  * Indentation: Indent right, Indent left (Tab/Shift+Tab)
  * Links: Insert/edit link button
* Active buttons use accent blue background.
* All icons are monochrome outline style (16x16px).

### Note Title

* Large, bold text (28px, 700 weight).
* Left aligned, minimal padding (8px vertical, 24px horizontal).
* **Last updated timestamp** shown below title in muted text (12px).
* Timestamp format: "25th of January 2026 at 2:30 PM"

### Content Area

* **Background**: same as main panel (`#111214`).
* **Padding**: 24px on all sides.
* **Text color**: off-white for main text, muted for metadata.
* Use clear vertical spacing between logical sections.

---

## Todo / Checklist Design

* **Sections**

  * Use headings within the note: e.g. `MIT`, `TODO`, `Gary`, etc.
  * Headings should be clearly differentiated: bold, slightly larger than body.

* **Checklist items**

  * Each item is a single row:
    * Left: 16x16px square checkbox (gray outline when unchecked, green fill with white check when checked).
    * Right: task text.
  * **Gap between checkbox and text: 8px**.
  * **Vertical spacing between items: 3px** (margin-bottom).
  * Multi-line items wrap under the text, aligned with the first line.
  * Checked items:
    * Dimmed text color (muted gray).
    * Strikethrough decoration.

* **Nested/Grouped items**

  * Indent child tasks under a parent using Tab key.
  * Indent size: 24px from parent item.
  * Nested task lists have 8px top margin.

* **Keyboard interactions**

  * **Enter** on a checklist item → create new checklist item below (not a paragraph).
  * Backspace at beginning of text on empty item → remove item.
  * **Tab** → indent checklist item (sink).
  * **Shift+Tab** → outdent checklist item (lift).
  * **Ctrl/Cmd+Enter** → toggle checkbox checked state.

---

## Interactions & States

* **Hover**

  * Subtle background lightening on interactive elements (buttons, note cards, sidebar items).

* **Focus**

  * Keyboard or focus ring visible: thin accent outline around focused item or field.

* **Active / pressed**

  * Slightly darker accent shade or depressed visual.

* **Scrolling**

  * Each pane (sidebar, list, detail) is vertically scrollable independently.
  * Scrollbars minimal and blend with dark theme.

* **Empty states**

  * Middle pane: show friendly message like “No notes yet” with a primary button to create the first note.
  * Note detail: if nothing selected, show placeholder text or illustration.

---

## Icons & Micro-details

* Use simple line icons:

  * Search, share, info, undo/redo, AI, font, size, color, more (three dots), star, checkbox, back.
* Icons are 16–20px with spacing between them.
* Align icons in toolbar to baseline and ensure consistent padding around touch targets (at least 32x32px clickable areas).

---

## Spacing & Grid

* Base spacing unit: 4px.
* Typical values:

  * Small gap: 4–8px.
  * Standard gap: 12–16px.
  * Large gap between major sections/panels: 24–32px.
* Keep vertical rhythm consistent:

  * Same top/bottom padding on cards and list rows.
  * Same margin under headings before content.

---

## Links

* **Styling**: Accent blue color (`#3B82F6`) with underline.
* **Auto-linking**: URLs are automatically detected while typing and converted to links.
* **Paste behavior**: When pasting a URL, it auto-links (fetches page title when possible).
* **Click behavior**: Links open in external browser (not in-app navigation).
* **Toolbar**: Link button to insert/edit/remove links.

---

## Special Notes

### Scratch Pad

* A permanent note that cannot be deleted or favorited.
* Title is fixed as "Scratch Pad" and cannot be edited.
* Always appears at the top of the sidebar, above Shortcuts.
* Uses a pencil/edit icon with yellow accent color.
* Provides a quick place for temporary notes and ideas.