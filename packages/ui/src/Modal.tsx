import { JSX, Show, Component, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: JSX.Element;
}

export const Modal: Component<ModalProps> = (props) => {
  // Handle escape key
  createEffect(() => {
    if (props.isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          props.onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      onCleanup(() => document.removeEventListener('keydown', handleEscape));
    }
  });

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div class="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            class="absolute inset-0 bg-black/50"
            onClick={props.onClose}
          />

          {/* Modal content */}
          <div class="relative bg-bg-secondary rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <Show when={props.title}>
              <h2 class="text-lg font-semibold text-text-primary mb-4">
                {props.title}
              </h2>
            </Show>
            {props.children}
          </div>
        </div>
      </Portal>
    </Show>
  );
};
