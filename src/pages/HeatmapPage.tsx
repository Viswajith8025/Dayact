import { addDays, format, startOfWeek, subWeeks } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getTeammateProfile, listActivitiesInRange, localDateString } from '../lib/activities'

export function HeatmapPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<'you' | 'partner'>('you')
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [counts, setCounts] = useState<Map<string, number>>(new Map())

  const weeks = 12
  const start = useMemo(
    () => startOfWeek(subWeeks(new Date(), weeks - 1), { weekStartsOn: 1 }),
    [],
  )
  const end = localDateString()

  useEffect(() => {
    if (!user) return
    void getTeammateProfile(user.id).then((r) => setPartnerId(r.data?.id ?? null))
  }, [user])

  const subjectId = view === 'you' ? user?.id : partnerId

  useEffect(() => {
    if (!subjectId) return
    void listActivitiesInRange(localDateString(start), end).then((result) => {
      const map = new Map<string, number>()
      for (const row of result.data ?? []) {
        if (row.user_id !== subjectId || row.status !== 'done') continue
        map.set(row.planned_for, (map.get(row.planned_for) ?? 0) + 1)
      }
      setCounts(map)
    })
  }, [subjectId, start, end])

  const cells: { date: string; count: number }[] = []
  for (let i = 0; i < weeks * 7; i += 1) {
    const d = addDays(start, i)
    const key = localDateString(d)
    if (key > end) break
    cells.push({ date: key, count: counts.get(key) ?? 0 })
  }

  const max = Math.max(1, ...cells.map((c) => c.count))

  return (
    <section className="space-y-[var(--space-section)]">
      <header className="space-y-[var(--space-3)]">
        <h1 className="typo-large-title text-[var(--color-text)]">Activity heatmap</h1>
        <div className="segmented" role="tablist">
          <button
            type="button"
            role="tab"
            className="segmented__item"
            aria-selected={view === 'you'}
            onClick={() => setView('you')}
          >
            You
          </button>
          <button
            type="button"
            role="tab"
            className="segmented__item"
            aria-selected={view === 'partner'}
            disabled={!partnerId}
            onClick={() => setView('partner')}
          >
            Partner
          </button>
        </div>
      </header>
      <div
        className="heatmap-grid"
        role="grid"
        aria-label="Done activities heatmap"
        style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
      >
        {cells.map((cell) => {
          const intensity = cell.count / max
          return (
            <button
              key={cell.date}
              type="button"
              className="heatmap-cell"
              title={`${cell.date}: ${cell.count} done`}
              aria-label={`${format(new Date(cell.date), 'EEE d MMM')}, ${cell.count} done`}
              style={{
                opacity: 0.15 + intensity * 0.85,
                background: 'var(--color-accent)',
              }}
              onClick={() => navigate(`/today?date=${cell.date}`)}
            />
          )
        })}
      </div>
    </section>
  )
}
