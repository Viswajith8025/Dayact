import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name

  return (
    <label
      htmlFor={inputId}
      className="flex flex-col gap-[var(--space-2)] typo-footnote text-[var(--color-text-muted)]"
    >
      <span>{label}</span>
      <input
        id={inputId}
        className={`field-input ${className}`.trim()}
        {...props}
      />
    </label>
  )
}
