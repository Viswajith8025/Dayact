import { useEffect, useState } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { SheetPortal } from './SheetPortal'

type RescheduleReasonSheetProps = {
  open: boolean
  title: string
  dateLabel: string
  initialDate: string
  onClose: () => void
  onConfirm: (date: string, reason: string) => Promise<string | null>
}

export function RescheduleReasonSheet({
  open,
  title,
  dateLabel,
  initialDate,
  onClose,
  onConfirm,
}: RescheduleReasonSheetProps) {
  const [date, setDate] = useState(initialDate)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDate(initialDate)
    setReason('')
    setError(null)
    setSaving(false)
  }, [open, initialDate])

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

  async function handleSubmit() {
    if (saving) return
    setSaving(true)
    setError(null)
    const result = await onConfirm(date, reason)
    setSaving(false)
    if (result) {
      setError(result)
      return
    }
    onClose()
  }

  return (
    <SheetPortal>
      <div
        className="sheet-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-sheet-title"
        onClick={onClose}
      >
        <div
          className="sheet-panel space-y-[var(--space-5)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sheet-grabber" aria-hidden />
          <h2 id="reschedule-sheet-title" className="typo-title text-[var(--color-text)]">
            {title}
          </h2>
          <Input
            label={dateLabel}
            name="reschedule_date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <label className="flex flex-col gap-[var(--space-2)] typo-footnote text-[var(--color-text-muted)]">
            <span>Reason (required)</span>
            <textarea
              name="reason"
              maxLength={200}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="field-input resize-y py-[var(--space-3)]"
            />
          </label>
          {error ? (
            <p role="alert" className="typo-subhead text-[var(--color-danger)]">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-[var(--space-3)] sm:flex-row">
            <Button type="button" variant="secondary" sheet className="sm:flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" sheet className="sm:flex-1" loading={saving} onClick={() => void handleSubmit()}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </SheetPortal>
  )
}
