import { Component, Show } from 'solid-js';
import type { NoteMeta } from '@pdtodo/types';
import './NoteItem.css';

interface NoteItemProps {
  note: NoteMeta;
  isSelected: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
  isTrash?: boolean;
}

export const NoteItem: Component<NoteItemProps> = (props) => {
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

  return (
    <button
      class="note-item"
      classList={{ 'is-selected': props.isSelected, 'is-trash': props.isTrash }}
      onClick={props.onSelect}
    >
      <div class="note-item-content">
        <span class="note-title">{props.note.title || 'Untitled'}</span>
        <span class="note-date">{formatDate(props.note.updatedAt)}</span>
      </div>
      <Show when={!props.isTrash}>
        <button
          class="star-btn"
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
      </Show>
    </button>
  );
};
