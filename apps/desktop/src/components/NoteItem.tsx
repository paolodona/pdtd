import { Component, Show, createSignal } from 'solid-js';
import type { NoteMeta } from '@pdtodo/types';
import './NoteItem.css';

interface NoteItemProps {
  note: NoteMeta;
  isSelected: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
  isTrash?: boolean;
}

export const NoteItem: Component<NoteItemProps> = (props) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleStarClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onToggleStar();
  };

  const handleDeleteClick = (e: MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
    props.onDelete();
  };

  const handleCancelDelete = (e: MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <button
        class="note-item"
        classList={{ 'is-selected': props.isSelected, 'is-trash': props.isTrash }}
        onClick={props.onSelect}
      >
        {/* Note icon */}
        <svg class="note-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span class="note-title">{props.note.title || 'Untitled'}</span>
        <Show when={!props.isTrash}>
          <div class="note-actions">
            <button
              class="action-btn star-btn"
              classList={{ 'is-starred': props.note.starred }}
              onClick={handleStarClick}
              aria-label={props.note.starred ? 'Remove from shortcuts' : 'Add to shortcuts'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={props.note.starred ? 'currentColor' : 'none'} stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
            <button
              class="action-btn delete-btn"
              onClick={handleDeleteClick}
              aria-label="Delete note"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </Show>
      </button>

      {/* Delete confirmation modal */}
      <Show when={showDeleteConfirm()}>
        <div class="delete-confirm-overlay" onClick={handleCancelDelete}>
          <div class="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p>Delete "{props.note.title || 'Untitled'}"?</p>
            <p class="delete-confirm-subtitle">This note will be moved to trash.</p>
            <div class="delete-confirm-actions">
              <button class="delete-confirm-btn cancel" onClick={handleCancelDelete}>
                Cancel
              </button>
              <button class="delete-confirm-btn confirm" onClick={handleConfirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};
