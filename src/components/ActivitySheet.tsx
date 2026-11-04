import { useEffect, useState, type FormEvent } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { SheetPortal } from './SheetPortal'
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
    planned_time: string | null
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
  const [plannedTime, setPlannedTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestSlow, setSuggestSlow] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setNotes(initial?.notes ?? '')
    setPlannedFor(initial?.planned_for ?? defaultPlannedFor)
    setFollowUpOn(initial?.follow_up_on ?? '')
    setPlannedTime(initial?.planned_time?.slice(0, 5) ?? '')
    setError(null)
    setSaving(false)
    setDiscardConfirmOpen(false)
  }, [open, initial, defaultPlannedFor])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (discardConfirmOpen) {
        setDiscardConfirmOpen(false)
        return
      }
      requestClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, discardConfirmOpen, title, notes, plannedFor, followUpOn, plannedTime, initial, defaultPlannedFor, onClose])

  if (!open) return null

  function isDirty(): boolean {
    const baseTitle = (initial?.title ?? '').trim()
    const baseNotes = (initial?.notes ?? '').trim()
    const basePlanned = initial?.planned_for ?? defaultPlannedFor
    const baseFollow = initial?.follow_up_on ?? ''
    const baseTime = initial?.planned_time?.slice(0, 5) ?? ''
    return (
      title.trim() !== baseTitle ||
      notes.trim() !== baseNotes ||
      plannedFor !== basePlanned ||
      followUpOn !== baseFollow ||
      plannedTime !== baseTime
    )
  }

  function requestClose() {
    if (isDirty()) {
      setDiscardConfirmOpen(true)
      return
    }
    onClose()
  }

  function confirmDiscard() {
    setDiscardConfirmOpen(false)
    onClose()
  }

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
      planned_time: plannedTime ? `${plannedTime}:00` : null,
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
    setSuggestSlow(false)
    setSuggestError(null)
    const timer = window.setTimeout(() => setSuggestSlow(true), 5000)
    const hint = [title.trim(), notes.trim()].filter(Boolean).join('. ')
    const result = await suggestActivityTitles(hint)
    window.clearTimeout(timer)
    setSuggesting(false)
    setSuggestSlow(false)
    if (result.error) {
      setSuggestError(result.error)
      setSuggestions([])
      return
    }
    setSuggestions(result.data ?? [])
  }

  return (
    <SheetPortal>
      <div
        className="sheet-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-sheet-title"
        onClick={() => requestClose()}
      >
        <form
          className="sheet-panel space-y-[var(--space-5)]"
          onSubmit={handleSubmit}
          noValidate
          onClick={(event) => event.stopPropagation()}
        >
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
          {suggestSlow && suggesting ? (
            <p role="status" className="typo-footnote text-[var(--color-text-muted)]">
              Still working…
            </p>
          ) : null}
          {suggestError ? (
            <p role="alert" className="typo-footnote text-[var(--color-danger)]">
              {suggestError}
            </p>
          ) : null}
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="btn btn--secondary w-full justify-start text-left"
              onClick={() => setTitle(suggestion)}
            >
              {suggestion}
            </button>
          ))}
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
          label="Time (optional)"
          name="planned_time"
          type="time"
          value={plannedTime}
          onChange={(e) => setPlannedTime(e.target.value)}
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
          <Button type="button" variant="secondary" sheet className="sm:flex-1" onClick={() => requestClose()}>
            Cancel
          </Button>
          <Button type="submit" sheet className="sm:flex-1" loading={saving}>
            Save
          </Button>
        </div>
      </form>
      {discardConfirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-[var(--space-page)] pb-[max(var(--space-page),env(safe-area-inset-bottom))] md:items-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="discard-sheet-title"
          onClick={() => setDiscardConfirmOpen(false)}
        >
          <div
            className="sheet-panel w-full max-w-sm space-y-[var(--space-5)] alert-panel-pop"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="discard-sheet-title" className="typo-title text-[var(--color-text)]">
              Discard changes?
            </h2>
            <p className="typo-subhead text-[var(--color-text-muted)]">
              Your edits won&apos;t be saved.
            </p>
            <div className="flex flex-col gap-[var(--space-3)] sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                sheet
                className="sm:flex-1"
                onClick={() => setDiscardConfirmOpen(false)}
              >
                Keep editing
              </Button>
              <Button type="button" variant="destructive" sheet className="sm:flex-1" onClick={confirmDiscard}>
                Discard
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </SheetPortal>
  )
}
