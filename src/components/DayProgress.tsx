import type { ActivityWithOwner } from '../lib/activities'
import { partnerAvatarLabel, productivityForDay } from '../lib/activities'

type DayProgressProps = {
  label: string
  activity: Pick<ActivityWithOwner, 'display_name' | 'avatar_emoji'>
  userId: string
  items: ActivityWithOwner[]
  highlight?: boolean
}

export function DayProgressBar({ label, activity, userId, items, highlight }: DayProgressProps) {
  const pct = productivityForDay(items, userId)
  const fill = pct ?? 0

  return (
    <div className={`day-progress${highlight ? ' day-progress--you' : ''}`}>
      <div className="day-progress__head">
        <span
          className="partner-avatar partner-avatar--sm"
          style={{ backgroundColor: 'var(--color-accent-tint)' }}
          aria-hidden
        >
          {partnerAvatarLabel(activity)}
        </span>
        <span className="typo-subhead text-[var(--color-text)]">{label}</span>
        <span className="typo-subhead tabular-nums text-[var(--color-text-muted)] ml-auto">
          {pct === null ? 'No plans' : `${pct}%`}
        </span>
      </div>
      <div
        className="day-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? 0}
        aria-label={`${label} productivity`}
      >
        <div className="day-progress__fill" style={{ width: `${fill}%` }} />
      </div>
    </div>
  )
}

type DuelStripProps = {
  youPct: number | null
  teammatePct: number | null
  teammateName: string
}

export function ProductivityDuelStrip({ youPct, teammatePct, teammateName }: DuelStripProps) {
  if (youPct === null && teammatePct === null) return null

  const youLabel = youPct === null ? '—' : `${youPct}%`
  const themLabel = teammatePct === null ? '—' : `${teammatePct}%`
  const youLead =
    youPct !== null && teammatePct !== null ? youPct > teammatePct : youPct !== null && teammatePct === null

  return (
    <p className="typo-footnote text-[var(--color-text-muted)]">
      {youLead ? <span aria-hidden>👑 </span> : null}
      You {youLabel} · {teammateName.trim() || 'Teammate'} {themLabel}
    </p>
  )
}
