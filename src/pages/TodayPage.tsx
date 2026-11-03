import { addDays, format } from 'date-fns'
import { ChevronLeft, ChevronRight, Flag, MoreVertical } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ActivitySheet } from '../components/ActivitySheet'
import { Button } from '../components/Button'
import { DisplayNamePrompt } from '../components/DisplayNamePrompt'
import { useAuth } from '../lib/auth'
import {
  awardAchievements,
  create,
  getMyProfile,
  listByDate,
  localDateString,
  notifyActivitiesChanged,
  notifyAchievementsAwarded,
  ownerInitial,
  parsePlannedDate,
  remove,
  setStatus,
  sortActivitiesForDay,
  update,
  userBadgeColor,
  type ActivityWithOwner,
} from '../lib/activities'

function ListSkeleton() {
  return (
    <ul className="grouped-list" aria-hidden>
      {[0, 1, 2].map((key) => (
        <li key={key} className="grouped-row">
          <div className="skeleton-block h-6 w-6 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton-block h-4 w-3/4 max-w-xs" />
            <div className="skeleton-block h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  )
}

type ActivityRowProps = {
  activity: ActivityWithOwner
  isOwn: boolean
  onToggleDone: (activity: ActivityWithOwner) => void
  onSkip: (activity: ActivityWithOwner) => void
  onEdit: (activity: ActivityWithOwner) => void
  onDelete: (activity: ActivityWithOwner) => void
}

function ActivityRow({
  activity,
  isOwn,
  onToggleDone,
  onSkip,
  onEdit,
  onDelete,
}: ActivityRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isDone = activity.status === 'done'
  const isSkipped = activity.status === 'skipped'
  const muted = isDone || isSkipped

  return (
    <li className={muted ? 'opacity-80' : undefined}>
      <div className="grouped-row">
        {isOwn ? (
          <button
            type="button"
            aria-label={isDone ? 'Mark as planned' : 'Mark as done'}
            onClick={() => onToggleDone(activity)}
            className={`activity-check ${isDone ? 'activity-check--checked' : ''}`}
          >
            <span className="activity-check__circle" aria-hidden />
            <svg className="activity-check__mark" viewBox="0 0 12 10" aria-hidden>
              <path d="M1 5 L4.5 8.5 L11 1" />
            </svg>
          </button>
        ) : (
          <div
            className="partner-avatar"
            style={{ backgroundColor: userBadgeColor(activity.user_id) }}
            aria-hidden
          >
            {ownerInitial(activity.display_name)}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-[var(--space-1)]">
          <div className="flex flex-wrap items-center gap-x-[var(--space-2)] gap-y-[var(--space-1)]">
            <p
              className={`typo-body activity-title ${isDone ? 'activity-title--done' : ''}`}
            >
              {activity.title}
            </p>
            {activity.follow_up_on ? (
              <span className="typo-caption text-[var(--color-text-muted)] inline-flex items-center gap-1">
                <Flag size={14} aria-hidden />
                Follow-up
              </span>
            ) : null}
          </div>
          <p className="typo-footnote text-[var(--color-text-muted)]">
            {activity.display_name.trim() || 'Teammate'}
            {isSkipped ? ' · Skipped' : isDone ? ' · Done' : ''}
          </p>
        </div>

        {isOwn ? (
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="Activity actions"
              className="btn btn--icon btn--tertiary"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreVertical size={20} aria-hidden />
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="menu-popover absolute right-0 top-full z-20 mt-1 min-w-36">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onEdit(activity)
                    }}
                  >
                    Edit
                  </button>
                  {activity.status === 'planned' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onSkip(activity)
                      }}
                    >
                      Skip
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="menu-popover__destructive"
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete(activity)
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  )
}

export function TodayPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const titleSentinelRef = useRef<HTMLDivElement>(null)

  const today = localDateString()
  const dateParam = searchParams.get('date')
  const selectedDate = useMemo(() => {
    if (dateParam && parsePlannedDate(dateParam)) return dateParam
    return today
  }, [dateParam, today])

  const selectedDateObj = useMemo(() => parsePlannedDate(selectedDate)!, [selectedDate])

  const [activities, setActivities] = useState<ActivityWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ActivityWithOwner | null>(null)
  const toggleInFlight = useRef(new Set<string>())

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

  const setDateInUrl = useCallback(
    (date: string) => {
      const params = new URLSearchParams(searchParams)
      if (date === today) {
        params.delete('date')
      } else {
        params.set('date', date)
      }
      const query = params.toString()
      navigate(query ? `/today?${query}` : '/today', { replace: false })
    },
    [navigate, searchParams, today],
  )

  const loadActivities = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await listByDate(selectedDate)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setActivities(result.data ?? [])
  }, [selectedDate])

  useEffect(() => {
    if (!user) return
    let active = true
    setProfileLoading(true)
    void getMyProfile(user.id).then((result) => {
      if (!active) return
      setProfileLoading(false)
      if (result.error) {
        setError(result.error)
        return
      }
      setDisplayName(result.data?.display_name ?? '')
    })
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    void loadActivities()
  }, [loadActivities])

  useEffect(() => {
    if (dateParam && !parsePlannedDate(dateParam)) {
      setDateInUrl(today)
    }
  }, [dateParam, setDateInUrl, today])

  const sorted = useMemo(() => {
    if (!user) return activities
    return sortActivitiesForDay(activities, user.id)
  }, [activities, user])

  async function handleToggleDone(activity: ActivityWithOwner) {
    if (!user || activity.user_id !== user.id) return
    if (toggleInFlight.current.has(activity.id)) return
    toggleInFlight.current.add(activity.id)
    const nextDone = activity.status !== 'done'
    const result = await setStatus(
      activity.id,
      nextDone ? 'done' : 'planned',
      nextDone ? new Date().toISOString() : null,
    )
    toggleInFlight.current.delete(activity.id)
    if (result.error) {
      setError(result.error)
      return
    }
    if (nextDone) {
      navigator.vibrate?.(8)
    }
    const updated = result.data!
    setActivities((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
    notifyActivitiesChanged()
    if (nextDone) {
      void awardAchievements().then((award) => {
        if (award.data?.length) notifyAchievementsAwarded(award.data)
      })
    }
  }

  async function handleSkip(activity: ActivityWithOwner) {
    const result = await setStatus(activity.id, 'skipped', null)
    if (result.error) {
      setError(result.error)
      return
    }
    const updated = result.data!
    if (updated.planned_for !== selectedDate) {
      setActivities((prev) => prev.filter((row) => row.id !== updated.id))
      notifyActivitiesChanged()
      return
    }
    setActivities((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
    notifyActivitiesChanged()
  }

  async function handleDelete(activity: ActivityWithOwner) {
    if (!window.confirm("Delete this activity? This can't be undone.")) return
    const result = await remove(activity.id)
    if (result.error) {
      setError(result.error)
      return
    }
    setActivities((prev) => prev.filter((row) => row.id !== activity.id))
    notifyActivitiesChanged()
  }

  async function handleSave(payload: {
    title: string
    notes: string | null
    planned_for: string
    follow_up_on: string | null
  }) {
    if (!user) return 'Not signed in'

    if (editing) {
      const result = await update(editing.id, payload)
      if (result.error) return result.error
      const updated = result.data!
      if (updated.planned_for === selectedDate) {
        setActivities((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
      } else {
        setActivities((prev) => prev.filter((row) => row.id !== updated.id))
      }
      notifyActivitiesChanged()
      return null
    }

    const result = await create({
      userId: user.id,
      ...payload,
    })
    if (result.error) return result.error
    const created = result.data!
    if (created.planned_for === selectedDate) {
      setActivities((prev) => [...prev, created])
    }
    notifyActivitiesChanged()
    return null
  }

  const headingDate = format(selectedDateObj, 'EEEE, d MMMM')
  const showDisplayNamePrompt =
    user && !profileLoading && displayName !== null && displayName.trim() === ''

  const emptyCopy =
    selectedDate === today
      ? 'Nothing planned. Add something for today.'
      : 'Nothing planned for this day.'

  return (
    <section className="space-y-[var(--space-section)]">
      {showDisplayNamePrompt ? (
        <DisplayNamePrompt
          userId={user.id}
          onSaved={(name) => {
            setDisplayName(name)
          }}
        />
      ) : null}

      <header className="space-y-[var(--space-4)]">
        <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
          <div>
            <h1 className="typo-large-title text-[var(--color-text)]">Today</h1>
            <p className="typo-subhead text-[var(--color-text-muted)]">{headingDate}</p>
            <div ref={titleSentinelRef} className="h-px w-full" aria-hidden />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setEditing(null)
              setSheetOpen(true)
            }}
          >
            Add
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
          <Button
            type="button"
            variant="tertiary"
            icon
            onClick={() => setDateInUrl(localDateString(addDays(selectedDateObj, -1)))}
            aria-label="Previous day"
          >
            <ChevronLeft size={20} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="tertiary"
            disabled={selectedDate === today}
            onClick={() => setDateInUrl(today)}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="tertiary"
            icon
            onClick={() => setDateInUrl(localDateString(addDays(selectedDateObj, 1)))}
            aria-label="Next day"
          >
            <ChevronRight size={20} aria-hidden />
          </Button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              const value = e.target.value
              if (parsePlannedDate(value)) setDateInUrl(value)
            }}
            className="field-input tabular-nums w-auto min-w-0 flex-1 sm:flex-none"
            aria-label="Jump to date"
          />
        </div>
      </header>

      {error ? (
        <div className="space-y-[var(--space-3)] rounded-[var(--radius-group)] bg-[var(--color-danger-surface)] px-[var(--space-4)] py-[var(--space-4)]">
          <p className="typo-subhead text-[var(--color-danger)]">
            Couldn't save that. Check your connection and try again.
          </p>
          <Button type="button" variant="tertiary" onClick={() => void loadActivities()}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading ? (
        <ListSkeleton />
      ) : sorted.length === 0 ? (
        <p className="typo-subhead text-[var(--color-text-muted)]">{emptyCopy}</p>
      ) : (
        <ul className="grouped-list">
          {sorted.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              isOwn={activity.user_id === user?.id}
              onToggleDone={handleToggleDone}
              onSkip={handleSkip}
              onEdit={(row) => {
                setEditing(row)
                setSheetOpen(true)
              }}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}

      <ActivitySheet
        open={sheetOpen}
        mode={editing ? 'edit' : 'create'}
        initial={editing}
        defaultPlannedFor={selectedDate}
        onClose={() => {
          setSheetOpen(false)
          setEditing(null)
        }}
        onSave={handleSave}
      />
    </section>
  )
}
