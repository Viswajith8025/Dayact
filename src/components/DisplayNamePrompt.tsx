import { useEffect, useState, type FormEvent } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { updateDisplayName } from '../lib/activities'

type DisplayNamePromptProps = {
  userId: string
  onSaved: (displayName: string) => void
  onDismiss?: () => void
}

export function DisplayNamePrompt({ userId, onSaved, onDismiss }: DisplayNamePromptProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onDismiss?.()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onDismiss])

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
      setError("Couldn't save that. Check your connection and try again.")
      return
    }

    onSaved(result.data!.display_name)
  }

  return (
    <div
      className="sheet-backdrop z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="display-name-title"
    >
      <form
        className="sheet-panel w-full max-w-md space-y-[var(--space-5)]"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="sheet-grabber" aria-hidden />
        <div className="space-y-[var(--space-2)]">
          <h2 id="display-name-title" className="typo-title text-[var(--color-text)]">
            What should we call you?
          </h2>
          <p className="typo-subhead text-[var(--color-text-muted)]">
            Your teammate will see this on shared activities.
          </p>
        </div>

        <Input
          label="Display name"
          name="display_name"
          autoComplete="nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {error ? (
          <p role="alert" className="typo-subhead text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}

        <Button type="submit" sheet loading={saving}>
          Save
        </Button>
      </form>
    </div>
  )
}
