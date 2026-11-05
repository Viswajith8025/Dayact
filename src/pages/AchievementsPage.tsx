import { format, parseISO } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'
import { PROFILE_UPDATED_EVENT } from '../components/ProfileSheet'
import {
  ACHIEVEMENT_DONE_TARGETS,
  COUNT_BASED_ACHIEVEMENTS,
  computeWeeklyScore,
  countDoneActivities,
  getMyProfile,
  getTeammateProfile,
  listAchievementCatalog,
  listActivitiesInRange,
  listOpenFollowups,
  listUserAchievements,
  listMoodInsights,
  weekRangeLocal,
  type AchievementDefinition,
  type ActivityWithOwner,
} from '../lib/activities'
import { partnerDisplayName } from '../lib/partnerLabel'

type ViewMode = 'you' | 'friend'

function MedalIcon({ locked = false }: { locked?: boolean }) {
  const fill = locked ? 'var(--color-separator)' : 'var(--color-accent)'
  const ring = locked ? 'var(--color-text-tertiary)' : 'rgba(255,255,255,0.45)'
  return (
    <svg className="medal-icon" width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <polygon
        points="22,6 27,16 38,18 29,26 31,38 22,32 13,38 15,26 6,18 17,16"
        fill={fill}
      />
      <circle cx="22" cy="21" r="8.5" fill="none" stroke={ring} strokeWidth="1" />
    </svg>
  )
}

export function AchievementsPage() {
  const { user } = useAuth()
  const titleSentinelRef = useRef<HTMLDivElement>(null)
  const [catalog, setCatalog] = useState<AchievementDefinition[]>([])
  const [earned, setEarned] = useState<Map<string, string>>(new Map())
  const [doneCount, setDoneCount] = useState(0)
  const [friend, setFriend] = useState<{ id: string; display_name: string; avatar_emoji: string | null } | null>(null)
  const [weekActivities, setWeekActivities] = useState<ActivityWithOwner[]>([])
  const [weekFollowups, setWeekFollowups] = useState<ActivityWithOwner[]>([])
  const [view, setView] = useState<ViewMode>('you')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [moodInsights, setMoodInsights] = useState<{ title: string; avg: number; count: number }[]>([])
  const [partnerNickname, setPartnerNickname] = useState<string | null>(null)

  const subjectId = view === 'you' ? user?.id : friend?.id

  useEffect(() => {
    const el = titleSentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.dispatchEvent(
          new CustomEvent('dayact:title-compact', { detail: !entry.isIntersecting }),
        )
      },
      { threshold: 0, rootMargin: '-56px 0px 0px 0px' },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      window.dispatchEvent(new CustomEvent('dayact:title-compact', { detail: false }))
    }
  }, [])

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
    if (!user) return
    void getMyProfile(user.id).then((result) => {
      if (result.data) setPartnerNickname(result.data.partner_nickname ?? null)
    })
    const onProfile = () => {
      void getMyProfile(user!.id).then((result) => {
        if (result.data) setPartnerNickname(result.data.partner_nickname ?? null)
      })
    }
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfile)
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, onProfile)
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

  useEffect(() => {
    if (!user) return
    let active = true
    const { from, to } = weekRangeLocal()
    void Promise.all([listActivitiesInRange(from, to), listOpenFollowups()]).then(
      ([activitiesResult, followResult]) => {
        if (!active) return
        if (!activitiesResult.error) setWeekActivities(activitiesResult.data ?? [])
        if (!followResult.error) setWeekFollowups(followResult.data ?? [])
      },
    )
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (!user || view !== 'you') return
    let active = true
    void listMoodInsights(user.id).then((result) => {
      if (!active) return
      setMoodInsights(result.data ?? [])
    })
    return () => {
      active = false
    }
  }, [user, view])

  const weekEnd = weekRangeLocal().to
  const weekStart = weekRangeLocal().from
  const yourWeekScore = useMemo(() => {
    if (!user || !weekActivities) return null
    return computeWeeklyScore(weekActivities, weekFollowups ?? [], user.id, weekStart, weekEnd)
  }, [user, weekActivities, weekFollowups, weekStart, weekEnd])

  const friendWeekScore = useMemo(() => {
    if (!friend || !weekActivities) return null
    return computeWeeklyScore(weekActivities, weekFollowups ?? [], friend.id, weekStart, weekEnd)
  }, [friend, weekActivities, weekFollowups, weekStart, weekEnd])

  const friendLabel = useMemo(() => {
    return partnerDisplayName({
      myPartnerNickname: partnerNickname,
      theirDisplayName: friend?.display_name,
    })
  }, [friend, partnerNickname])

  if (loading) {
    return (
      <section className="space-y-[var(--space-4)]" aria-hidden>
        <div className="skeleton-block h-9 w-48" />
        <div className="skeleton-block h-11 w-56" />
        <ul className="grouped-list">
          {[0, 1, 2].map((key) => (
            <li key={key} className="grouped-row">
              <div className="skeleton-block h-11 w-11 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton-block h-4 w-40" />
                <div className="skeleton-block h-3 w-full max-w-sm" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section className="space-y-[var(--space-section)] pb-[var(--space-8)] md:pb-0">
      <header className="space-y-[var(--space-4)]">
        <h1 className="typo-large-title text-[var(--color-text)]">Achievements</h1>
        <div ref={titleSentinelRef} className="h-px w-full" aria-hidden />

        <div className="segmented segmented--stretch w-full" role="tablist" aria-label="Achievement view">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'you'}
            className="segmented__item"
            onClick={() => setView('you')}
          >
            You
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'friend'}
            disabled={!friend}
            className="segmented__item truncate disabled:opacity-40"
            onClick={() => setView('friend')}
          >
            <span className="truncate">{friendLabel}</span>
          </button>
        </div>
      </header>

      {user && yourWeekScore ? (
        <div className="week-duel-card space-y-[var(--space-3)]">
          <div>
            <h2 className="typo-headline text-[var(--color-text)]">This week</h2>
            <p className="mt-[var(--space-1)] typo-footnote text-[var(--color-text-muted)]">
              Honor-system points · done +10, perfect day +25, follow-up +5, overdue −5
            </p>
          </div>
          <div className="flex gap-[var(--space-3)]">
            <p
              className={`week-score-chip ${
                friendWeekScore && friendWeekScore.total > yourWeekScore.total
                  ? 'week-score-chip--muted'
                  : ''
              }`}
            >
              {(yourWeekScore.total > (friendWeekScore?.total ?? -1) ? '👑 ' : '') +
                `You ${yourWeekScore.total}`}
            </p>
            {friend && friendWeekScore ? (
              <p
                className={`week-score-chip ${
                  friendWeekScore.total > yourWeekScore.total ? '' : 'week-score-chip--muted'
                }`}
              >
                {(friendWeekScore.total > yourWeekScore.total ? '👑 ' : '') +
                  `${friendLabel} ${friendWeekScore.total}`}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {view === 'you' && moodInsights.length > 0 ? (
        <div className="week-duel-card space-y-[var(--space-2)]">
          <h2 className="typo-headline text-[var(--color-text)]">Mood insights</h2>
          <p className="typo-subhead text-[var(--color-text-muted)]">
            Top activities by average mood (min 2 check-ins)
          </p>
          <ul className="space-y-[var(--space-2)]">
            {moodInsights.slice(0, 5).map((row) => (
              <li key={row.title} className="flex justify-between gap-[var(--space-3)] typo-subhead">
                <span className="truncate text-[var(--color-text)]">{row.title}</span>
                <span className="shrink-0 tabular-nums text-[var(--color-text-muted)]">
                  {row.avg.toFixed(1)} · {row.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="typo-subhead text-[var(--color-danger)]">
          Couldn't load achievements. Check your connection and try again.
        </p>
      ) : null}

      <ul className="grouped-list">
        {catalog.map((item) => {
          const earnedAt = earned.get(item.code)
          const isEarned = Boolean(earnedAt)
          const showProgress =
            view === 'you' && !isEarned && COUNT_BASED_ACHIEVEMENTS.has(item.code)
          const target = ACHIEVEMENT_DONE_TARGETS[item.code]

          return (
            <li key={item.code}>
              <div className="grouped-row items-center">
                <MedalIcon locked={!isEarned} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-[var(--space-2)]">
                    <p className="typo-headline text-[var(--color-text)]">{item.title}</p>
                    {isEarned ? (
                      <p className="typo-footnote tabular-nums text-[var(--color-text-muted)]">
                        {format(parseISO(earnedAt!), 'd MMM yyyy')}
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-[var(--space-1)] typo-subhead text-[var(--color-text-muted)]">
                    {item.description}
                  </p>
                  {showProgress && target ? (
                    <>
                      <p className="mt-[var(--space-2)] typo-footnote tabular-nums text-[var(--color-text-muted)]">
                        {Math.min(doneCount, target)} / {target} done
                      </p>
                      <div className="day-progress__track mt-[var(--space-1)]">
                        <div
                          className="day-progress__fill"
                          style={{
                            width: `${Math.min(100, (Math.min(doneCount, target) / target) * 100)}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
