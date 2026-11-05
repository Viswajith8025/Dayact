import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'accentOutline'
  loading?: boolean
  sheet?: boolean
  icon?: boolean
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
  sheet = false,
  icon = false,
  className = '',
  type = 'button',
  disabled,
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'btn--primary',
    secondary: 'btn--secondary',
    tertiary: 'btn--tertiary',
    destructive: 'btn--destructive',
    accentOutline: 'btn--accent-outline',
  }[variant]

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sheet ? 'btn--sheet' : ''} ${icon ? 'btn--icon' : ''} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="btn-spinner" aria-hidden /> : children}
    </button>
  )
}
