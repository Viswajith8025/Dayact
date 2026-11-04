import { format, startOfWeek, endOfWeek } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import {
  computeWeeklyScore,
  getTeammateProfile,
  listActivitiesInRange,
  listOpenFollowups,
  localDateString,
  weekRangeLocal,
} from '../lib/activities'
import { useAuth } from '../lib/auth'
import { fetchJointStreak } from '../lib/streaks'

type WeeklyRecapCardProps = {
  forceShow?: boolean
}

export function WeeklyRecapCard({ forceShow }: WeeklyRecapCardProps) {
  const { user } = useAuth()
  const cardRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [summary, setSummary] = useState<string>('')

  useEffect(() => {
    const day = new Date().getDay()
    setVisible(forceShow || day === 0)
  }, [forceShow])

  useEffect(() => {
    if (!visible || !user) return
    const { from, to } = weekRangeLocal()
    void Promise.all([
      listActivitiesInRange(from, to),
      listOpenFollowups(),
      getTeammateProfile(user.id),
      fetchJointStreak(),
    ]).then(([acts, follow, mate, streak]) => {
      const items = acts.data ?? []
      const you = computeWeeklyScore(items, follow.data ?? [], user.id, from, to)
      const them =
        mate.data && items.length
          ? computeWeeklyScore(items, follow.data ?? [], mate.data.id, from, to)
          : null
      setSummary(
        `Week ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'd MMM')}–${format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'd MMM')}: You ${you.total} pts${them ? ` · ${mate.data!.display_name || 'Teammate'} ${them.total}` : ''}. Joint streak ${streak.data?.current ?? 0} (best ${streak.data?.best ?? 0}).`,
      )
    })
  }, [visible, user])

  if (!visible) return null

  async function shareCard() {
    const el = cardRef.current
    if (!el) return
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(el, { pixelRatio: 2 })
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], `dayact-recap-${localDateString()}.png`, { type: 'image/png' })
    if (navigator.share) {
      await navigator.share({ title: 'Dayact weekly recap', files: [file] })
      return
    }
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = file.name
    a.click()
  }

  return (
    <section ref={cardRef} className="week-duel-card space-y-[var(--space-3)]" aria-label="Weekly recap">
      <h2 className="typo-headline text-[var(--color-text)]">Weekly recap</h2>
      <p className="typo-subhead text-[var(--color-text-muted)]">{summary || 'Loading recap…'}</p>
      <Button type="button" variant="secondary" onClick={() => void shareCard()}>
        Share recap
      </Button>
    </section>
  )
}
