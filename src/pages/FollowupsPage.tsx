import { useCallback, useEffect, useMemo, useState } from 'react'
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
    <li
      className={`rounded-[var(--radius-md)] bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-4)] ${
        overdue ? 'border-l-2 border-[var(--color-accent)] pl-[calc(var(--space-4)-2px)]' : ''
      }`}
    >
      <div className="flex items-start gap-[var(--space-3)]">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-sm)] font-medium text-white"
          style={{ backgroundColor: userBadgeColor(activity.user_id) }}
          aria-hidden
        >
          {ownerInitial(activity.display_name)}
        </div>

        <div className="min-w-0 flex-1 space-y-[var(--space-2)]">
          <button
            type="button"
            onClick={() => onEdit(activity)}
            className="block w-full text-left"
          >
            <p className="text-[var(--text-base)] leading-[var(--leading-normal)] text-[var(--color-text)]">
              {activity.title}
            </p>
            <p
              className={`text-[var(--text-sm)] leading-[var(--leading-normal)] ${
                overdue ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
              }`}
            >
              {formatFollowUpRelative(activity.follow_up_on!, today)}
            </p>
            <p className="text-[var(--text-xs)] leading-[var(--leading-relaxed)] text-[var(--color-text-muted)]">
              {activity.display_name.trim() || 'Teammate'} ·{' '}
              {formatPlannedForSecondary(activity.planned_for)}
            </p>
          </button>

          {isOwn ? (
            <div className="flex flex-wrap gap-[var(--space-2)]">
              <Button type="button" variant="ghost" className="px-[var(--space-3)]" onClick={() => onDone(activity)}>
                Done
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="px-[var(--space-3)]"
                onClick={() => setShowReschedule((open) => !open)}
              >
                Reschedule
              </Button>
              <Button type="button" variant="ghost" className="px-[var(--space-3)]" onClick={() => onClear(activity)}>
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
                className="min-h-[var(--touch-min)] rounded-[var(--radius-md)] border border-transparent bg-[var(--color-surface-elevated)] px-[var(--space-3)] text-[var(--text-sm)] text-[var(--color-text)]"
                aria-label="New follow-up date"
              />
              <Button
                type="button"
                className="px-[var(--space-4)]"
                onClick={() => {
                  onReschedule(activity, rescheduleDate)
                  setShowReschedule(false)
                }}
              >
                Save date
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
    <ul className="space-y-[var(--space-3)]" aria-hidden>
      {[0, 1, 2].map((key) => (
        <li
          key={key}
          className="h-20 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)]"
        />
      ))}
    </ul>
  )
}

export function FollowupsPage() {
  const { user } = useAuth()
  const today = localDateString()
  const [items, setItems] = useState<ActivityWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ActivityWithOwner | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

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
        <h1 className="text-[var(--text-xl)] font-medium leading-[var(--leading-tight)] text-[var(--color-text)]">
          Followups
        </h1>
        <p className="text-[var(--text-sm)] leading-[var(--leading-relaxed)] text-[var(--color-text-muted)]">
          Open follow-ups across your shared space.
        </p>
      </header>

      {error ? (
        <div className="space-y-[var(--space-3)] rounded-[var(--radius-md)] bg-[var(--color-danger-surface)] px-[var(--space-4)] py-[var(--space-4)]">
          <p className="text-[var(--text-sm)] leading-[var(--leading-normal)] text-[var(--color-danger)]">
            {error}
          </p>
          <Button type="button" variant="ghost" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {loading ? (
        <ListSkeleton />
      ) : allEmpty ? (
        <p className="text-[var(--text-sm)] leading-[var(--leading-relaxed)] text-[var(--color-text-muted)]">
          No open follow-ups.
        </p>
      ) : (
        visibleGroups.map((groupKey) => (
          <section key={groupKey} className="space-y-[var(--space-3)]">
            <h2 className="text-[var(--text-sm)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              {groupLabels[groupKey]}
            </h2>
            <ul className="space-y-[var(--space-3)]">
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
