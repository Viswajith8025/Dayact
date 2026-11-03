import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name

  return (
    <label
      htmlFor={inputId}
      className="flex flex-col gap-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)]"
    >
      <span>{label}</span>
      <input
        id={inputId}
        className={`min-h-[var(--touch-min)] w-full rounded-[var(--radius-md)] border border-transparent bg-[var(--color-surface-elevated)] px-[var(--space-4)] text-[var(--color-text)] outline-none ring-0 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] ${className}`.trim()}
        {...props}
      />
    </label>
  )
}
