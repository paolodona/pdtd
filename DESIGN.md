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
  * Checklist unchecked box: medium gray outline
  * Checklist checked box: filled accent blue with white check

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
   * Sections:

     * Search bar at top.
     * “Primary action” button (e.g. **+ Note**) below search, full width.
     * “Shortcuts” list with small icons and labels (e.g. “AI Strategy”, “Recruitment”…).
     * “Recent notes” list with smaller items.
     * Bottom: secondary navigation (Trash, Settings, etc.).
   * Scrollable independently from the main content.

3. **Right pane (note detail)**

   * Fills remaining horizontal space.
   * Top: compact toolbar for the note.
   * Body: full-height editor area with padding around content.
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

* Horizontal toolbar aligned to the top edge.
* Elements, left to right:

  * Back navigation (if applicable).
  * Breadcrumb or notebook path (e.g. “1 Staycity > TODO”).
  * Icons: AI assistant, share, info, undo/redo.
  * Formatting options on the right: text style dropdown, font selector, font size, color, “More” menu (for extra formatting).
* All icons are monochrome outline style; active ones use accent color.

### Note Title

* Large, bold text (e.g. “TODO”).
* Left aligned, top margin around 16–24px, with breathing space from toolbar.

### Content Area

* **Background**: same as panel.
* **Padding**: at least 24px on all sides.
* **Text color**: off-white for main text, muted for metadata.
* Use clear vertical spacing between logical sections (e.g. “MIT” block vs “TODO” block).

---

## Todo / Checklist Design

* **Sections**

  * Use headings within the note: e.g. `MIT`, `TODO`, `Gary`, etc.
  * Headings should be clearly differentiated: small caps or bold, slightly larger than body.

* **Checklist items**

  * Each item is a single row:

    * Left: square checkbox (outline when unchecked, filled accent with check icon when checked).
    * Right: task text.
  * Vertical spacing between checklist items: 4–6px.
  * Multi-line items wrap under the text, aligned with the first line (indented so they don’t appear under the checkbox).
  * Checked items may:

    * Dim text color, and/or
    * Add a subtle strikethrough (optional; Evernote doesn’t always show it but it’s a good UX option).

* **Nested/Grouped items**

  * Indent child tasks under a parent label (e.g. section “Gary” with indented subtasks).
  * Indent size: 16–24px from parent item’s text.
  * Optional: use bullet/chevron icon for top-level group label instead of a checkbox if it’s just a header.

* **Keyboard interactions**

  * Enter on a checklist item → create new checklist item below.
  * Backspace at beginning of text on empty item → remove item.
  * Tab / Shift+Tab → indent / outdent checklist items to form hierarchy.

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