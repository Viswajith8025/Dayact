import { useEffect, useState } from 'react'
import { Button } from './Button'
import { SheetPortal } from './SheetPortal'
import { setActivityMood, type ActivityWithOwner } from '../lib/activities'

const MOODS = ['😫', '😕', '😐', '🙂', '🤩']

type MoodPromptProps = {
  activity: ActivityWithOwner | null
  onClose: () => void
  onSaved: (updated: ActivityWithOwner) => void
}

export function MoodPrompt({ activity, onClose, onSaved }: MoodPromptProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!activity) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activity, onClose])

  if (!activity) return null

  async function pick(mood: number) {
    if (saving) return
    setSaving(true)
    setError(null)
    const result = await setActivityMood(activity!.id, mood)
    setSaving(false)
    if (result.error || !result.data) {
      setError(result.error ?? 'Could not save mood.')
      return
    }
    setSaved(true)
    onSaved(result.data)
    window.setTimeout(() => onClose(), 400)
  }

  return (
    <SheetPortal>
      <div
        className="sheet-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mood-prompt-title"
        onClick={onClose}
      >
        <div className="sheet-panel space-y-[var(--space-5)]" onClick={(e) => e.stopPropagation()}>
          <h2 id="mood-prompt-title" className="typo-title text-[var(--color-text)]">
            How did it feel?
          </h2>
          <p className="typo-subhead text-[var(--color-text-muted)]">{activity.title}</p>
          <div className="flex flex-wrap justify-between gap-[var(--space-2)]">
            {MOODS.map((emoji, index) => (
              <button
                key={emoji}
                type="button"
                className="btn btn--secondary text-2xl min-w-[3rem]"
                disabled={saving}
                aria-label={`Mood ${index + 1} of 5`}
                onClick={() => void pick(index + 1)}
              >
                {emoji}
              </button>
            ))}
          </div>
          {saved ? (
            <p role="status" className="typo-footnote text-[var(--color-text-muted)]">
              Saved.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="typo-footnote text-[var(--color-danger)]">
              {error}
            </p>
          ) : null}
          <Button type="button" variant="tertiary" onClick={onClose}>
            Skip
          </Button>
        </div>
      </div>
    </SheetPortal>
  )
}
