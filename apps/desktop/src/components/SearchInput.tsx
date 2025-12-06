import { Component, onMount, onCleanup } from 'solid-js';
import { registerSearchInput, restorePreviousFocus } from '../stores/focusStore';
import './SearchInput.css';

interface SearchInputProps {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
}

export const SearchInput: Component<SearchInputProps> = (props) => {
  let inputRef: HTMLInputElement | undefined;

  onMount(() => {
    if (inputRef) {
      registerSearchInput(inputRef);
    }
  });

  onCleanup(() => {
    registerSearchInput(null);
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      inputRef?.blur();
      restorePreviousFocus();
    }
  };

  return (
    <div class="search-input">
      <svg
        class="search-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={props.placeholder ?? 'Search...'}
        class="search-input-field"
      />
      {props.value && (
        <button
          class="search-clear-btn"
          onClick={() => props.onInput('')}
          aria-label="Clear search"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.707 5.293a1 1 0 00-1.414 1.414L10.586 12l-5.293 5.293a1 1 0 101.414 1.414L12 13.414l5.293 5.293a1 1 0 001.414-1.414L13.414 12l5.293-5.293a1 1 0 00-1.414-1.414L12 10.586 6.707 5.293z" />
          </svg>
        </button>
      )}
    </div>
  );
};
