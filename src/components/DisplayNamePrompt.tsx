import { useState, type FormEvent } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { updateDisplayName } from '../lib/activities'

type DisplayNamePromptProps = {
  userId: string
  onSaved: (displayName: string) => void
}

export function DisplayNamePrompt({ userId, onSaved }: DisplayNamePromptProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a name to continue.')
      return
    }
    if (trimmed.length > 60) {
      setError('Keep it under 60 characters.')
      return
    }

    setSaving(true)
    setError(null)
    const result = await updateDisplayName(userId, trimmed)
    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    onSaved(result.data!.display_name)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,var(--color-text)_25%,transparent)] p-[var(--space-page)] md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="display-name-title"
    >
      <form
        className="w-full max-w-md space-y-[var(--space-5)] rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-6)]"
        onSubmit={handleSubmit}
      >
        <div className="space-y-[var(--space-2)]">
          <h2
            id="display-name-title"
            className="text-[var(--text-lg)] font-medium leading-[var(--leading-tight)] text-[var(--color-text)]"
          >
            What should we call you?
          </h2>
          <p className="text-[var(--text-sm)] leading-[var(--leading-relaxed)] text-[var(--color-text-muted)]">
            Your teammate will see this on shared activities.
          </p>
        </div>

        <Input
          label="Display name"
          name="display_name"
          autoComplete="nickname"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {error ? (
          <p
            role="alert"
            className="text-[var(--text-sm)] leading-[var(--leading-normal)] text-[var(--color-danger)]"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Continue'}
        </Button>
      </form>
    </div>
  )
}
