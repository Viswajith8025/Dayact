import { addDays, format } from 'date-fns'
import { Flag, MoreVertical } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
    <ul className="space-y-[var(--space-3)]" aria-hidden>
      {[0, 1, 2].map((key) => (
        <li
          key={key}
          className="h-16 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)]"
        />
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
    <li
      className={`flex items-start gap-[var(--space-3)] rounded-[var(--radius-md)] bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-4)] ${
        muted ? 'opacity-70' : ''
      }`}
    >
      {isOwn ? (
        <button
          type="button"
          aria-label={isDone ? 'Mark as planned' : 'Mark as done'}
          onClick={() => onToggleDone(activity)}
          className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${
            isDone
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)]'
          }`}
        >
          {isDone ? '✓' : ''}
        </button>
      ) : (
        <div
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-sm)] font-medium text-white"
          style={{ backgroundColor: userBadgeColor(activity.user_id) }}
          aria-hidden
        >
          {ownerInitial(activity.display_name)}
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-[var(--space-1)]">
        <div className="flex flex-wrap items-center gap-x-[var(--space-2)] gap-y-[var(--space-1)]">
          <p
            className={`text-[var(--text-base)] leading-[var(--leading-normal)] text-[var(--color-text)] ${
              isDone ? 'line-through' : ''
            }`}
          >
            {activity.title}
          </p>
          {activity.follow_up_on ? (
            <span className="inline-flex items-center gap-1 text-[var(--text-xs)] text-[var(--color-text-muted)]">
              <Flag size={14} aria-hidden />
              Follow-up
            </span>
          ) : null}
        </div>
        <p className="text-[var(--text-xs)] leading-[var(--leading-normal)] text-[var(--color-text-muted)]">
          {activity.display_name.trim() || 'Teammate'}
          {isSkipped ? ' · Skipped' : isDone ? ' · Done' : ''}
        </p>
      </div>

      {isOwn ? (
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="Activity actions"
            className="flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreVertical size={20} />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-10 mt-1 min-w-36 rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] py-[var(--space-1)] shadow-lg">
              <button
                type="button"
                className="block w-full px-[var(--space-4)] py-[var(--space-3)] text-left text-[var(--text-sm)] hover:bg-[var(--color-bg)]"
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
                  className="block w-full px-[var(--space-4)] py-[var(--space-3)] text-left text-[var(--text-sm)] hover:bg-[var(--color-bg)]"
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
                className="block w-full px-[var(--space-4)] py-[var(--space-3)] text-left text-[var(--text-sm)] text-[var(--color-danger)] hover:bg-[var(--color-bg)]"
                onClick={() => {
                  setMenuOpen(false)
                  onDelete(activity)
                }}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

export function TodayPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

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
    const nextDone = activity.status !== 'done'
    const result = await setStatus(
      activity.id,
      nextDone ? 'done' : 'planned',
      nextDone ? new Date().toISOString() : null,
    )
    if (result.error) {
      setError(result.error)
      return
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
    if (!window.confirm(`Delete “${activity.title}”?`)) return
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

  const headingDate = format(selectedDateObj, 'EEEE, MMMM d')
  const showDisplayNamePrompt =
    user && !profileLoading && displayName !== null && displayName.trim() === ''

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
            <h1 className="text-[var(--text-xl)] font-medium leading-[var(--leading-tight)] text-[var(--color-text)]">
              {selectedDate === today ? 'Today' : 'Day'}
            </h1>
            <p className="text-[var(--text-sm)] leading-[var(--leading-relaxed)] text-[var(--color-text-muted)]">
              {headingDate}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setEditing(null)
              setSheetOpen(true)
            }}
          >
            Add activity
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
          <Button
            type="button"
            variant="ghost"
            className="min-w-[var(--touch-min)] px-[var(--space-3)]"
            onClick={() => setDateInUrl(localDateString(addDays(selectedDateObj, -1)))}
            aria-label="Previous day"
          >
            ←
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="px-[var(--space-4)]"
            disabled={selectedDate === today}
            onClick={() => setDateInUrl(today)}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-w-[var(--touch-min)] px-[var(--space-3)]"
            onClick={() => setDateInUrl(localDateString(addDays(selectedDateObj, 1)))}
            aria-label="Next day"
          >
            →
          </Button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              const value = e.target.value
              if (parsePlannedDate(value)) setDateInUrl(value)
            }}
            className="min-h-[var(--touch-min)] rounded-[var(--radius-md)] border border-transparent bg-[var(--color-surface-elevated)] px-[var(--space-3)] text-[var(--text-sm)] text-[var(--color-text)]"
            aria-label="Jump to date"
          />
        </div>
      </header>

      {error ? (
        <div className="space-y-[var(--space-3)] rounded-[var(--radius-md)] bg-[var(--color-danger-surface)] px-[var(--space-4)] py-[var(--space-4)]">
          <p className="text-[var(--text-sm)] leading-[var(--leading-normal)] text-[var(--color-danger)]">
            {error}
          </p>
          <Button type="button" variant="ghost" onClick={() => void loadActivities()}>
            Retry
          </Button>
        </div>
      ) : null}

      {loading ? (
        <ListSkeleton />
      ) : sorted.length === 0 ? (
        <p className="text-[var(--text-sm)] leading-[var(--leading-relaxed)] text-[var(--color-text-muted)]">
          Nothing planned for this day.
        </p>
      ) : (
        <ul className="space-y-[var(--space-3)]">
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
