import { useEffect, useState } from 'react'
import { fetchJointStreak, type JointStreakStats } from '../lib/streaks'

export function JointStreakCard() {
  const [stats, setStats] = useState<JointStreakStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const result = await fetchJointStreak()
      if (!active) return
      setStats(result.data)
      setLoading(false)
    }
    void load()

    const onChange = () => void load()
    window.addEventListener('dayact:activities-changed', onChange)
    return () => {
      active = false
      window.removeEventListener('dayact:activities-changed', onChange)
    }
  }, [])

  if (loading && !stats) {
    return (
      <div className="joint-streak-card" aria-busy="true">
        <div className="skeleton-block h-16 w-full rounded-[var(--radius-group)]" />
      </div>
    )
  }

  const current = stats?.current ?? 0
  const best = stats?.best ?? 0

  return (
    <section className="joint-streak-card" aria-label="Joint streak">
      <div className="joint-streak-card__flame" aria-hidden>
        <span className="joint-streak-card__flame-icon">🔥</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="typo-headline text-[var(--color-text)]">Joint streak</p>
        <p className="typo-subhead text-[var(--color-text-muted)]">
          Both of you need at least one done item per day.
        </p>
      </div>
      <div className="text-right tabular-nums">
        <p className="typo-title text-[var(--color-accent)]">{current}</p>
        <p className="typo-footnote text-[var(--color-text-muted)]">Best {best}</p>
      </div>
    </section>
  )
}
