import { JSX, splitProps, Component } from 'solid-js';

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: Component<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, ['variant', 'size', 'class', 'children']);

  const variant = () => local.variant ?? 'primary';
  const size = () => local.size ?? 'md';

  const baseClasses = 'inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-accent-primary text-white hover:bg-accent-hover focus:ring-accent-primary',
    secondary: 'bg-bg-tertiary text-text-primary hover:bg-border-primary focus:ring-border-primary',
    ghost: 'bg-transparent text-text-primary hover:bg-bg-tertiary focus:ring-border-primary',
    danger: 'bg-accent-danger text-white hover:opacity-90 focus:ring-accent-danger',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      class={`${baseClasses} ${variantClasses[variant()]} ${sizeClasses[size()]} ${local.class ?? ''}`}
      {...others}
    >
      {local.children}
    </button>
  );
};
