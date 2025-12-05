import { JSX, splitProps, Component } from 'solid-js';

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input: Component<InputProps> = (props) => {
  const [local, others] = splitProps(props, ['class', 'error']);

  const baseClasses = 'w-full px-3 py-2 bg-bg-input border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-colors';
  const errorClasses = local.error ? 'border-accent-danger' : 'border-border-primary';

  return (
    <input
      class={`${baseClasses} ${errorClasses} ${local.class ?? ''}`}
      {...others}
    />
  );
};
