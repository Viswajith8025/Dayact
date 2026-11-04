import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useAuth } from '../lib/auth'
import {
  createChallenge,
  listChallengeProgress,
  listChallenges,
  type Challenge,
  type ChallengeProgress,
} from '../lib/challenges'
import { localDateString } from '../lib/activities'

export function ChallengesPage() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [progress, setProgress] = useState<Map<string, ChallengeProgress[]>>(new Map())
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState(5)
  const [days, setDays] = useState(7)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const result = await listChallenges()
    setChallenges(result.data)
    const map = await listChallengeProgress(result.data.map((c) => c.id))
    setProgress(map)
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleCreate() {
    if (!user) return
    const result = await createChallenge({
      userId: user.id,
      title: title || '[QA] Challenge',
      targetCount: target,
      durationDays: days,
      startDate: localDateString(),
    })
    if (result.error) {
      setError(result.error)
      return
    }
    setTitle('')
    void load()
  }

  return (
    <section className="space-y-[var(--space-section)]">
      <h1 className="typo-large-title text-[var(--color-text)]">Couple challenges</h1>

      <div className="week-duel-card space-y-[var(--space-3)]">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input
          label="Target done count"
          type="number"
          min={1}
          value={String(target)}
          onChange={(e) => setTarget(Number(e.target.value))}
        />
        <Input
          label="Days"
          type="number"
          min={1}
          value={String(days)}
          onChange={(e) => setDays(Number(e.target.value))}
        />
        {error ? (
          <p className="typo-footnote text-[var(--color-danger)]">{error}</p>
        ) : null}
        <Button type="button" onClick={() => void handleCreate()}>
          Start challenge
        </Button>
      </div>

      <ul className="grouped-list">
        {challenges.map((c) => {
          const rows = progress.get(c.id) ?? []
          return (
            <li key={c.id} className="grouped-row flex-col items-stretch gap-[var(--space-3)]">
              <div>
                <p className="typo-headline text-[var(--color-text)]">{c.title}</p>
                <p className="typo-footnote text-[var(--color-text-muted)]">
                  {c.status} · target {c.target_count} in {c.duration_days} days
                </p>
              </div>
              {rows.map((row) => (
                <div key={row.user_id} className="space-y-[var(--space-1)]">
                  <div className="flex justify-between typo-footnote">
                    <span>{row.user_id === user?.id ? 'You' : 'Partner'}</span>
                    <span>
                      {row.done_count}/{c.target_count}
                    </span>
                  </div>
                  <div className="day-progress__track">
                    <div
                      className="day-progress__fill"
                      style={{ width: `${Math.min(100, (row.done_count / c.target_count) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
