import { addDays, format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Button } from './Button'
import { SheetPortal } from './SheetPortal'
import { create, listActivitiesInRange, localDateString } from '../lib/activities'
import { suggestPlanWeek } from '../lib/groqSuggest'
import { useAuth } from '../lib/auth'

type PlanWeekSheetProps = {
  open: boolean
  onClose: () => void
}

export function PlanWeekSheet({ open, onClose }: PlanWeekSheetProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ date: string; suggestions: string[] }[]>([])

  useEffect(() => {
    if (!open) {
      setPreview([])
      setError(null)
      setSlow(false)
    }
  }, [open])

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

  if (!open || !user) return null

  const tomorrow = localDateString(addDays(new Date(), 1))

  function planFromTomorrow(days: { date: string; suggestions: string[] }[]) {
    return days.filter((day) => day.date >= tomorrow).slice(0, 7)
  }

  async function runSuggest() {
    setLoading(true)
    setSlow(false)
    setError(null)
    const timer = window.setTimeout(() => setSlow(true), 5000)
    const from = localDateString(addDays(new Date(), -30))
    const to = localDateString()
    const history = await listActivitiesInRange(from, to)
    const payload = JSON.stringify(history.data ?? [])
    const result = await suggestPlanWeek(payload)
    window.clearTimeout(timer)
    setLoading(false)
    setSlow(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setPreview(planFromTomorrow(result.data ?? []))
  }

  async function applyPlan() {
    if (!user) return
    setLoading(true)
    for (const day of preview) {
      for (const title of day.suggestions.slice(0, 3)) {
        await create({
          userId: user.id,
          title,
          notes: null,
          planned_for: day.date,
          follow_up_on: null,
        })
      }
    }
    setLoading(false)
    onClose()
  }

  return (
    <SheetPortal>
      <div className="sheet-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="sheet-panel space-y-[var(--space-4)]" onClick={(e) => e.stopPropagation()}>
          <h2 className="typo-title text-[var(--color-text)]">Plan my week</h2>
          <p className="typo-subhead text-[var(--color-text-muted)]">
            Uses your last 30 days to suggest activities from tomorrow through the next week.
          </p>
          <Button type="button" loading={loading} onClick={() => void runSuggest()}>
            Generate plan
          </Button>
          {slow && loading ? (
            <p role="status" className="typo-footnote text-[var(--color-text-muted)]">
              Still working…
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="typo-footnote text-[var(--color-danger)]">
              {error}
            </p>
          ) : null}
          <ul className="space-y-[var(--space-3)] max-h-[40vh] overflow-y-auto">
            {preview.map((day) => (
              <li key={day.date}>
                <p className="typo-subhead font-semibold">{format(new Date(day.date), 'EEE d MMM')}</p>
                <ul className="typo-footnote text-[var(--color-text-muted)] list-disc pl-4">
                  {day.suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {preview.length > 0 ? (
            <Button type="button" sheet loading={loading} onClick={() => void applyPlan()}>
              Add to my list
            </Button>
          ) : null}
          <Button type="button" variant="secondary" sheet onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </SheetPortal>
  )
}
