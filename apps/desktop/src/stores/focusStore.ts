/**
 * Focus Store - Manages focus coordination between search input and editor
 *
 * This store enables:
 * - Ctrl+F to focus search input while saving editor cursor position
 * - Escape in search to return focus to editor at saved position
 */

// Reference to the search input element
let searchInputElement: HTMLInputElement | null = null;

// Callback to save current editor selection
let saveEditorSelection: (() => void) | null = null;

// Callback to restore editor focus with saved selection
let restoreEditorFocus: (() => void) | null = null;

/**
 * Register the search input element
 */
export function registerSearchInput(element: HTMLInputElement | null): void {
  searchInputElement = element;
}

/**
 * Register callbacks for editor focus management
 */
export function registerEditorFocus(
  save: () => void,
  restore: () => void
): void {
  saveEditorSelection = save;
  restoreEditorFocus = restore;
}

/**
 * Unregister editor focus callbacks (for cleanup)
 */
export function unregisterEditorFocus(): void {
  saveEditorSelection = null;
  restoreEditorFocus = null;
}

/**
 * Focus the search input, saving editor selection first
 */
export function focusSearch(): boolean {
  if (!searchInputElement) {
    return false;
  }

  // Save the current editor selection before focusing search
  if (saveEditorSelection) {
    saveEditorSelection();
  }

  searchInputElement.focus();
  searchInputElement.select(); // Select all text for easy replacement
  return true;
}

/**
 * Restore focus to the editor with saved selection
 */
export function restorePreviousFocus(): void {
  if (restoreEditorFocus) {
    restoreEditorFocus();
  }
}
