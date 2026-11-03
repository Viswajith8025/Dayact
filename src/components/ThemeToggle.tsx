import { useTheme } from '../lib/ThemeProvider'
import type { ThemePreference } from '../lib/theme'

const options: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'Auto' },
]

export function ThemeToggle() {
  const { preference, setPreference } = useTheme()

  return (
    <div role="group" aria-label="Appearance" className="space-y-[var(--space-2)]">
      <span className="typo-footnote text-[var(--color-text-muted)]">Appearance</span>
      <div className="segmented segmented--stretch">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="segmented__item"
            aria-selected={preference === option.id}
            onClick={() => setPreference(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
