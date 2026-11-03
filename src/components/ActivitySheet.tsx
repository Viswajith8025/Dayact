import { useEffect, useState, type FormEvent } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import type { ActivityWithOwner } from '../lib/activities'

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

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setNotes(initial?.notes ?? '')
    setPlannedFor(initial?.planned_for ?? defaultPlannedFor)
    setFollowUpOn(initial?.follow_up_on ?? '')
    setError(null)
    setSaving(false)
  }, [open, initial, defaultPlannedFor])

  if (!open) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title is required.')
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
      setError(saveError)
      return
    }

    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-[color-mix(in_srgb,var(--color-text)_25%,transparent)] p-[var(--space-page)] md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-sheet-title"
    >
      <form
        className="max-h-[90dvh] w-full max-w-lg space-y-[var(--space-5)] overflow-y-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-6)]"
        onSubmit={handleSubmit}
      >
        <h2
          id="activity-sheet-title"
          className="text-[var(--text-lg)] font-medium leading-[var(--leading-tight)] text-[var(--color-text)]"
        >
          {mode === 'create' ? 'Add activity' : 'Edit activity'}
        </h2>

        <Input
          label="Title"
          name="title"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="flex flex-col gap-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
          <span>Notes (optional)</span>
          <textarea
            name="notes"
            maxLength={1000}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[6rem] w-full resize-y rounded-[var(--radius-md)] border border-transparent bg-[var(--color-surface-elevated)] px-[var(--space-4)] py-[var(--space-3)] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
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
          <p
            role="alert"
            className="text-[var(--text-sm)] leading-[var(--leading-normal)] text-[var(--color-danger)]"
          >
            {error}
          </p>
        ) : null}

        <div className="flex gap-[var(--space-3)]">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  )
}
