import { format, parseISO } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import {
  ACHIEVEMENT_DONE_TARGETS,
  COUNT_BASED_ACHIEVEMENTS,
  countDoneActivities,
  getTeammateProfile,
  listAchievementCatalog,
  listUserAchievements,
  type AchievementDefinition,
} from '../lib/activities'

type ViewMode = 'you' | 'friend'

export function AchievementsPage() {
  const { user } = useAuth()
  const [catalog, setCatalog] = useState<AchievementDefinition[]>([])
  const [earned, setEarned] = useState<Map<string, string>>(new Map())
  const [doneCount, setDoneCount] = useState(0)
  const [friend, setFriend] = useState<{ id: string; display_name: string } | null>(null)
  const [view, setView] = useState<ViewMode>('you')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const subjectId = view === 'you' ? user?.id : friend?.id

  useEffect(() => {
    if (!user) return
    let active = true

    async function load() {
      if (!user) return
      setLoading(true)
      setError(null)

      const [catalogResult, teammateResult] = await Promise.all([
        listAchievementCatalog(),
        getTeammateProfile(user.id),
      ])

      if (!active) return

      if (catalogResult.error) {
        setError(catalogResult.error)
        setLoading(false)
        return
      }

      setCatalog(catalogResult.data ?? [])
      setFriend(teammateResult.data ?? null)
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (!subjectId) return
    let active = true

    async function loadSubject() {
      if (!subjectId) return
      const id = subjectId
      const [earnedResult, doneResult] = await Promise.all([
        listUserAchievements(id),
        countDoneActivities(id),
      ])
      if (!active) return
      if (earnedResult.error) {
        setError(earnedResult.error)
        return
      }
      if (doneResult.error) {
        setError(doneResult.error)
        return
      }
      setEarned(new Map((earnedResult.data ?? []).map((row) => [row.code, row.earned_at])))
      setDoneCount(doneResult.data ?? 0)
    }

    void loadSubject()
    return () => {
      active = false
    }
  }, [subjectId])

  const friendLabel = useMemo(() => {
    const name = friend?.display_name.trim()
    return name || 'Teammate'
  }, [friend])

  if (loading) {
    return (
      <section className="space-y-[var(--space-4)]">
        <div className="h-8 w-40 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)]" />
        <div className="h-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)]" />
      </section>
    )
  }

  return (
    <section className="space-y-[var(--space-section)]">
      <header className="space-y-[var(--space-4)]">
        <h1 className="text-[var(--text-xl)] font-medium leading-[var(--leading-tight)] text-[var(--color-text)]">
          Achievements
        </h1>

        <div
          className="inline-flex rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] p-1"
          role="tablist"
          aria-label="Achievement view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'you'}
            className={`min-h-[var(--touch-min)] rounded-[var(--radius-sm)] px-[var(--space-4)] text-[var(--text-sm)] ${
              view === 'you'
                ? 'bg-[var(--color-surface)] font-medium text-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)]'
            }`}
            onClick={() => setView('you')}
          >
            You
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'friend'}
            disabled={!friend}
            className={`min-h-[var(--touch-min)] rounded-[var(--radius-sm)] px-[var(--space-4)] text-[var(--text-sm)] disabled:opacity-40 ${
              view === 'friend'
                ? 'bg-[var(--color-surface)] font-medium text-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)]'
            }`}
            onClick={() => setView('friend')}
          >
            {friendLabel}
          </button>
        </div>
      </header>

      {error ? (
        <p className="text-[var(--text-sm)] text-[var(--color-danger)]">{error}</p>
      ) : null}

      <ul className="space-y-[var(--space-3)]">
        {catalog.map((item) => {
          const earnedAt = earned.get(item.code)
          const isEarned = Boolean(earnedAt)
          const showProgress =
            view === 'you' && !isEarned && COUNT_BASED_ACHIEVEMENTS.has(item.code)
          const target = ACHIEVEMENT_DONE_TARGETS[item.code]

          return (
            <li
              key={item.code}
              className={`rounded-[var(--radius-md)] px-[var(--space-5)] py-[var(--space-4)] ${
                isEarned
                  ? 'bg-[var(--color-surface)] text-[var(--color-text)]'
                  : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] opacity-80'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-[var(--space-2)]">
                <p
                  className={`text-[var(--text-base)] font-medium leading-[var(--leading-tight)] ${
                    isEarned ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {item.title}
                </p>
                {isEarned ? (
                  <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
                    {format(parseISO(earnedAt!), 'd MMM yyyy')}
                  </p>
                ) : null}
              </div>
              <p className="mt-[var(--space-2)] text-[var(--text-sm)] leading-[var(--leading-relaxed)]">
                {item.description}
              </p>
              {showProgress && target ? (
                <p className="mt-[var(--space-2)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
                  {Math.min(doneCount, target)} / {target} done
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
