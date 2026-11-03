import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'ghost'
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex min-h-[var(--touch-min)] items-center justify-center rounded-[var(--radius-md)] px-[var(--space-5)] text-[var(--text-sm)] font-medium leading-[var(--leading-tight)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50'

  const variants = {
    primary:
      'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:opacity-90',
    ghost:
      'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
  }

  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
