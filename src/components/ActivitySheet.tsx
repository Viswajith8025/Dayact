import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import type { ActivityWithOwner } from '../lib/activities'
import { suggestActivityTitles } from '../lib/groqSuggest'

export type ActivitySheetMode = 'create' | 'edit'

type ActivitySheetProps = {
  open: boolean
  mode: ActivitySheetMode
  initial: ActivityWithOwner | null
  defaultPlannedFor: string
  onClose: () => void
  onSave: (payload: {
    title: string
    notes: string | null
    planned_for: string
    follow_up_on: string | null
  }) => Promise<string | null>
}

export function ActivitySheet({
  open,
  mode,
  initial,
  defaultPlannedFor,
  onClose,
  onSave,
}: ActivitySheetProps) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [plannedFor, setPlannedFor] = useState(defaultPlannedFor)
  const [followUpOn, setFollowUpOn] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setNotes(initial?.notes ?? '')
    setPlannedFor(initial?.planned_for ?? defaultPlannedFor)
    setFollowUpOn(initial?.follow_up_on ?? '')
    setError(null)
    setSaving(false)
    setSuggesting(false)
    setSuggestError(null)
    setSuggestions([])
  }, [open, initial, defaultPlannedFor])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Add a title to continue.')
      return
    }
    if (trimmedTitle.length > 120) {
      setError('Title must be 120 characters or less.')
      return
    }
    const trimmedNotes = notes.trim()
    if (trimmedNotes.length > 1000) {
      setError('Notes must be 1000 characters or less.')
      return
    }

    setSaving(true)
    setError(null)
    const saveError = await onSave({
      title: trimmedTitle,
      notes: trimmedNotes ? trimmedNotes : null,
      planned_for: plannedFor,
      follow_up_on: followUpOn ? followUpOn : null,
    })
    setSaving(false)

    if (saveError) {
      setError("Couldn't save that. Check your connection and try again.")
      return
    }

    onClose()
  }

  async function handleSuggest() {
    if (suggesting || saving) return
    setSuggesting(true)
    setSuggestError(null)
    const hint = [title.trim(), notes.trim()].filter(Boolean).join('. ')
    const result = await suggestActivityTitles(hint)
    setSuggesting(false)
    if (result.error) {
      setSuggestError(result.error)
      setSuggestions([])
      return
    }
    setSuggestions(result.data ?? [])
  }

  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-sheet-title"
    >
      <form className="sheet-panel space-y-[var(--space-5)]" onSubmit={handleSubmit} noValidate>
        <div className="sheet-grabber" aria-hidden />
        <h2 id="activity-sheet-title" className="typo-title text-[var(--color-text)]">
          {mode === 'create' ? 'Add activity' : 'Edit activity'}
        </h2>

        <Input
          label="Title"
          name="title"
          maxLength={120}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (error) setError(null)
          }}
        />

        <div className="space-y-[var(--space-2)]">
          <Button
            type="button"
            variant="tertiary"
            loading={suggesting}
            disabled={saving}
            onClick={() => void handleSuggest()}
          >
            Suggest titles
          </Button>
          {suggesting ? <div className="suggest-shimmer" aria-hidden /> : null}
          {suggestError ? (
            <p role="alert" className="typo-footnote text-[var(--color-danger)]">
              {suggestError}
            </p>
          ) : null}
          {suggestions.length > 0 ? (
            <ul className="motion-stagger flex flex-col gap-[var(--space-2)]" aria-label="AI suggestions">
              {suggestions.map((suggestion, index) => (
                <li key={suggestion} style={{ '--stagger-index': index } as CSSProperties}>
                  <button
                    type="button"
                    className="btn btn--secondary w-full justify-start text-left"
                    onClick={() => setTitle(suggestion)}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <label className="flex flex-col gap-[var(--space-2)] typo-footnote text-[var(--color-text-muted)]">
          <span>Notes (optional)</span>
          <textarea
            name="notes"
            maxLength={1000}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="field-input min-h-[6rem] resize-y py-[var(--space-3)]"
          />
        </label>

        <Input
          label="Plan for date"
          name="planned_for"
          type="date"
          required
          value={plannedFor}
          onChange={(e) => setPlannedFor(e.target.value)}
        />

        <Input
          label="Follow-up date (optional)"
          name="follow_up_on"
          type="date"
          value={followUpOn}
          onChange={(e) => setFollowUpOn(e.target.value)}
        />

        {error ? (
          <p role="alert" className="typo-subhead text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-[var(--space-3)] sm:flex-row">
          <Button type="button" variant="secondary" sheet className="sm:flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" sheet className="sm:flex-1" loading={saving}>
            Save
          </Button>
        </div>
      </form>
    </div>
  )
}
