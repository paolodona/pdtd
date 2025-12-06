import { Component, JSX, Show, For, createEffect, onCleanup } from 'solid-js';
import './DropdownMenu.css';

export interface MenuItem {
  label: string;
  icon?: JSX.Element;
  onClick: () => void;
}

interface DropdownMenuProps {
  items: MenuItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const DropdownMenu: Component<DropdownMenuProps> = (props) => {
  let menuRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (props.isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        if (menuRef && !menuRef.contains(e.target as Node)) {
          props.onClose();
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          props.onClose();
        }
      };

      // Delay to prevent immediate close from the same click
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
      }, 0);

      onCleanup(() => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      });
    }
  });

  const handleItemClick = (item: MenuItem) => {
    item.onClick();
    props.onClose();
  };

  return (
    <Show when={props.isOpen}>
      <div class="dropdown-menu" ref={menuRef}>
        <For each={props.items}>
          {(item) => (
            <button
              class="dropdown-menu-item"
              onClick={() => handleItemClick(item)}
            >
              <Show when={item.icon}>
                <span class="dropdown-menu-icon">{item.icon}</span>
              </Show>
              <span class="dropdown-menu-label">{item.label}</span>
            </button>
          )}
        </For>
      </div>
    </Show>
  );
};
