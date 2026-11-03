import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivitySheet } from '../components/ActivitySheet'
import { Button } from '../components/Button'
import { useAuth } from '../lib/auth'
import {
  clearFollowUp,
  formatFollowUpRelative,
  formatPlannedForSecondary,
  groupOpenFollowups,
  listOpenFollowups,
  localDateString,
  notifyActivitiesChanged,
  ownerInitial,
  rescheduleFollowUp,
  setFollowUpDone,
  update,
  userBadgeColor,
  type ActivityWithOwner,
  type FollowUpGroup,
} from '../lib/activities'

const groupLabels: Record<FollowUpGroup, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
}

type FollowUpRowProps = {
  activity: ActivityWithOwner
  isOwn: boolean
  today: string
  onEdit: (activity: ActivityWithOwner) => void
  onDone: (activity: ActivityWithOwner) => void
  onReschedule: (activity: ActivityWithOwner, date: string) => void
  onClear: (activity: ActivityWithOwner) => void
  overdue: boolean
}

function FollowUpRow({
  activity,
  isOwn,
  today,
  onEdit,
  onDone,
  onReschedule,
  onClear,
  overdue,
}: FollowUpRowProps) {
  const [rescheduleDate, setRescheduleDate] = useState(activity.follow_up_on ?? today)
  const [showReschedule, setShowReschedule] = useState(false)

  return (
    <li>
      <div className={`grouped-row ${overdue ? 'border-l-2 border-[var(--color-accent)]' : ''}`}>
        <div
          className="partner-avatar"
          style={{ backgroundColor: userBadgeColor(activity.user_id) }}
          aria-hidden
        >
          {ownerInitial(activity.display_name)}
        </div>

        <div className="min-w-0 flex-1 space-y-[var(--space-2)]">
          {isOwn ? (
            <button type="button" onClick={() => onEdit(activity)} className="block w-full text-left">
              <p className="typo-body text-[var(--color-text)]">{activity.title}</p>
              <p
                className={`typo-subhead tabular-nums ${
                  overdue ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
                }`}
              >
                {formatFollowUpRelative(activity.follow_up_on!, today)}
              </p>
              <p className="typo-footnote text-[var(--color-text-muted)]">
                {activity.display_name.trim() || 'Teammate'} ·{' '}
                {formatPlannedForSecondary(activity.planned_for)}
              </p>
            </button>
          ) : (
            <div className="block w-full text-left">
              <p className="typo-body text-[var(--color-text)]">{activity.title}</p>
              <p
                className={`typo-subhead tabular-nums ${
                  overdue ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
                }`}
              >
                {formatFollowUpRelative(activity.follow_up_on!, today)}
              </p>
              <p className="typo-footnote text-[var(--color-text-muted)]">
                {activity.display_name.trim() || 'Teammate'} ·{' '}
                {formatPlannedForSecondary(activity.planned_for)}
              </p>
            </div>
          )}

          {isOwn ? (
            <div className="flex flex-wrap gap-[var(--space-2)]">
              <Button type="button" variant="tertiary" onClick={() => onDone(activity)}>
                Done
              </Button>
              <Button type="button" variant="tertiary" onClick={() => setShowReschedule((open) => !open)}>
                Reschedule
              </Button>
              <Button type="button" variant="tertiary" onClick={() => onClear(activity)}>
                Remove follow-up
              </Button>
            </div>
          ) : null}

          {isOwn && showReschedule ? (
            <div className="flex flex-wrap items-center gap-[var(--space-2)]">
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="field-input tabular-nums w-auto"
                aria-label="New follow-up date"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onReschedule(activity, rescheduleDate)
                  setShowReschedule(false)
                }}
              >
                Save
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function ListSkeleton() {
  return (
    <ul className="grouped-list" aria-hidden>
      {[0, 1, 2].map((key) => (
        <li key={key} className="grouped-row">
          <div className="skeleton-block h-7 w-7 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton-block h-4 w-2/3 max-w-xs" />
            <div className="skeleton-block h-3 w-32" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function FollowupsPage() {
  const { user } = useAuth()
  const today = localDateString()
  const titleSentinelRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<ActivityWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ActivityWithOwner | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await listOpenFollowups()
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setItems(result.data ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const groups = useMemo(() => groupOpenFollowups(items, today), [items, today])
  const visibleGroups = (['overdue', 'today', 'upcoming'] as FollowUpGroup[]).filter(
    (key) => groups[key].length > 0,
  )
  const allEmpty = !loading && visibleGroups.length === 0

  async function applyMutation(mutator: () => Promise<string | null>) {
    const message = await mutator()
    if (message) {
      setError(message)
      return
    }
    notifyActivitiesChanged()
    await load()
  }

  async function handleSave(payload: {
    title: string
    notes: string | null
    planned_for: string
    follow_up_on: string | null
  }) {
    if (!editing) return 'Nothing to edit'
    const result = await update(editing.id, payload)
    if (result.error) return result.error
    notifyActivitiesChanged()
    await load()
    return null
  }

  return (
    <section className="space-y-[var(--space-section)]">
      <header className="space-y-[var(--space-2)]">
        <h1 className="typo-large-title text-[var(--color-text)]">Follow-ups</h1>
        <p className="typo-subhead text-[var(--color-text-muted)]">
          Open follow-ups across your shared space.
        </p>
        <div ref={titleSentinelRef} className="h-px w-full" aria-hidden />
      </header>

      {error ? (
        <div className="space-y-[var(--space-3)] rounded-[var(--radius-group)] bg-[var(--color-danger-surface)] px-[var(--space-4)] py-[var(--space-4)]">
          <p className="typo-subhead text-[var(--color-danger)]">
            Couldn't save that. Check your connection and try again.
          </p>
          <Button type="button" variant="tertiary" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading ? (
        <ListSkeleton />
      ) : allEmpty ? (
        <p className="typo-subhead text-[var(--color-text-muted)]">You're all caught up.</p>
      ) : (
        visibleGroups.map((groupKey) => (
          <section key={groupKey} className="space-y-[var(--space-3)]">
            <h2 className="typo-caption text-[var(--color-text-muted)] uppercase tracking-wide">
              {groupLabels[groupKey]}
            </h2>
            <ul className="grouped-list">
              {groups[groupKey].map((activity) => (
                <FollowUpRow
                  key={activity.id}
                  activity={activity}
                  isOwn={activity.user_id === user?.id}
                  today={today}
                  overdue={groupKey === 'overdue'}
                  onEdit={(row) => {
                    setEditing(row)
                    setSheetOpen(true)
                  }}
                  onDone={(row) =>
                    applyMutation(async () => {
                      const result = await setFollowUpDone(row.id)
                      return result.error
                    })
                  }
                  onReschedule={(row, date) =>
                    applyMutation(async () => {
                      const result = await rescheduleFollowUp(row.id, date)
                      return result.error
                    })
                  }
                  onClear={(row) =>
                    applyMutation(async () => {
                      const result = await clearFollowUp(row.id)
                      return result.error
                    })
                  }
                />
              ))}
            </ul>
          </section>
        ))
      )}

      <ActivitySheet
        open={sheetOpen}
        mode="edit"
        initial={editing}
        defaultPlannedFor={editing?.planned_for ?? today}
        onClose={() => {
          setSheetOpen(false)
          setEditing(null)
        }}
        onSave={handleSave}
      />
    </section>
  )
}
