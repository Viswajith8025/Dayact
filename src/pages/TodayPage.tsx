import { addDays, format } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, Flag, MoreVertical } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ActivitySheet } from '../components/ActivitySheet'
import { Button } from '../components/Button'
import { DayProgressBar, ProductivityDuelStrip } from '../components/DayProgress'
import { JointStreakCard } from '../components/JointStreakCard'
import { MoodPrompt } from '../components/MoodPrompt'
import { PlanWeekSheet } from '../components/PlanWeekSheet'
import { WeeklyRecapCard } from '../components/WeeklyRecapCard'
import { DateCalendarSheet } from '../components/DateCalendarSheet'
import { DisplayNamePrompt } from '../components/DisplayNamePrompt'
import { RescheduleReasonSheet } from '../components/RescheduleReasonSheet'
import { SheetPortal } from '../components/SheetPortal'
import { PROFILE_UPDATED_EVENT } from '../components/ProfileSheet'
import { computeAnchoredMenuPosition } from '../lib/menuPosition'
import { useAuth } from '../lib/auth'
import {
  awardAchievements,
  continueTomorrow,
  create,
  formatPlannedTime,
  getMyProfile,
  getTeammateProfile,
  listByDate,
  localDateString,
  markInProgress,
  notifyActivitiesChanged,
  notifyAchievementsAwarded,
  parsePlannedDate,
  partnerAvatarLabel,
  productivityForDay,
  remove,
  reschedulePlannedFor,
  setStatus,
  sortActivitiesForDay,
  update,
  userBadgeColor,
  type ActivityWithOwner,
} from '../lib/activities'
import { incrementChallengeProgress, decrementChallengeProgressForDone } from '../lib/challenges'
import { partnerDisplayName } from '../lib/partnerLabel'
import { sendPartnerReminder } from '../lib/partnerReminder'
import { upsertReaction, subscribeReactions, type ReactionEmoji } from '../lib/reactions'

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
  exiting?: boolean
  staggerIndex: number
  onToggleDone: (activity: ActivityWithOwner) => void
  onSkip: (activity: ActivityWithOwner) => void
  onUnskip: (activity: ActivityWithOwner) => void
  onEdit: (activity: ActivityWithOwner) => void
  onDelete: (activity: ActivityWithOwner) => void
  onPartialDone: (activity: ActivityWithOwner) => void
  onContinueTomorrow: (activity: ActivityWithOwner) => void
  onReschedule: (activity: ActivityWithOwner) => void
  onCheer: (activity: ActivityWithOwner, emoji: import('../lib/reactions').ReactionEmoji) => void
  partnerLabel: string
}

function ActivityRow({
  activity,
  isOwn,
  exiting = false,
  staggerIndex,
  onToggleDone,
  onSkip,
  onUnskip,
  onEdit,
  onDelete,
  onPartialDone,
  onContinueTomorrow,
  onReschedule,
  onCheer,
  partnerLabel,
}: ActivityRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [remindBusy, setRemindBusy] = useState(false)
  const [remindNote, setRemindNote] = useState<string | null>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const isDone = activity.status === 'done'
  const isSkipped = activity.status === 'skipped'
  const isInProgress = activity.status === 'in_progress'
  const muted = isDone || isSkipped
  const hasOpenFollowUp = Boolean(activity.follow_up_on && !activity.follow_up_done)
  const timeLabel = formatPlannedTime(activity.planned_time)

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  function openActionsMenu() {
    const el = menuBtnRef.current
    if (!el) return
    if (menuOpen) {
      setMenuOpen(false)
      return
    }
    setMenuPos(computeAnchoredMenuPosition(el))
    setMenuOpen(true)
  }

  return (
    <li
      className={`${muted && !exiting ? 'opacity-80' : ''} ${exiting ? 'motion-exit' : ''}`.trim() || undefined}
      style={{ '--stagger-index': staggerIndex } as CSSProperties}
    >
      <div className="grouped-row">
        {isOwn ? (
          <button
            type="button"
            aria-label={isDone ? 'Mark as planned' : 'Mark as done'}
            onClick={() => onToggleDone(activity)}
            className={`activity-check ${isDone ? 'activity-check--checked' : ''}${isInProgress ? ' activity-check--partial' : ''}`}
            style={
              isInProgress
                ? ({ '--progress-pct': activity.progress_pct || 50 } as CSSProperties)
                : undefined
            }
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
            {partnerAvatarLabel(activity)}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-[var(--space-1)]">
          <div className="flex flex-wrap items-center gap-x-[var(--space-2)] gap-y-[var(--space-1)]">
            <p
              className={`typo-body activity-title ${isDone ? 'activity-title--done' : ''}`}
            >
              {activity.title}
            </p>
            {hasOpenFollowUp ? (
              <span className="typo-caption text-[var(--color-text-muted)] inline-flex items-center gap-1">
                <Flag size={14} aria-hidden />
                Follow-up
              </span>
            ) : null}
          </div>
          <p className="typo-footnote text-[var(--color-text-muted)]">
            {(isOwn ? activity.display_name : partnerLabel).trim() || 'Teammate'}
            {timeLabel ? ` · ${timeLabel}` : ''}
            {isSkipped ? ' · Skipped' : isDone ? ' · Done' : isInProgress ? ` · ${activity.progress_pct}%` : ''}
          </p>
          {!isOwn && !isDone && !isSkipped ? (
            <div className="flex flex-wrap items-center gap-[var(--space-2)]">
              <Button
                type="button"
                variant="secondary"
                loading={remindBusy}
                disabled={remindNote === 'Funny poke sent' || remindNote === 'Already poked today'}
                onClick={() => {
                  if (remindBusy) return
                  setRemindBusy(true)
                  void sendPartnerReminder(activity.id).then((result) => {
                    setRemindBusy(false)
                    if (!result.ok) setRemindNote(result.error)
                    else setRemindNote(result.deduped ? 'Already poked today' : 'Funny poke sent')
                  })
                }}
              >
                Remind
              </Button>
              {remindNote ? (
                <span className="typo-footnote text-[var(--color-text-muted)]">{remindNote}</span>
              ) : null}
            </div>
          ) : null}
          {!isOwn && isDone ? (
            <div className="flex flex-wrap gap-[var(--space-1)]" role="group" aria-label="Cheer">
              {(['fist', 'fire', 'clap', 'heart'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className="btn btn--icon btn--tertiary text-base"
                  aria-label={`Send ${key}`}
                  onClick={() => onCheer(activity, key)}
                >
                  {key === 'fist' ? '👊' : key === 'fire' ? '🔥' : key === 'clap' ? '👏' : '❤️'}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {isOwn ? (
          <div className="relative shrink-0">
            <button
              ref={menuBtnRef}
              type="button"
              aria-label="Activity actions"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="btn btn--icon btn--tertiary"
              onClick={openActionsMenu}
            >
              <MoreVertical size={20} aria-hidden />
            </button>
            {menuOpen && menuPos ? (
              <SheetPortal>
                <button
                  type="button"
                  className="fixed inset-0 z-[55] bg-black/25"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="menu-popover menu-popover--motion fixed z-[56] min-w-[10rem]"
                  style={{ top: menuPos.top, left: menuPos.left }}
                >
                  <button
                    type="button"
                    role="menuitem"
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
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        onSkip(activity)
                      }}
                    >
                      Skip
                    </button>
                  ) : null}
                  {activity.status === 'planned' || activity.status === 'in_progress' ? (
                    <>
                      {activity.status === 'planned' ? (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false)
                            onPartialDone(activity)
                          }}
                        >
                          Partly done
                        </button>
                      ) : null}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false)
                          onContinueTomorrow(activity)
                        }}
                      >
                        Continue tomorrow
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false)
                          onReschedule(activity)
                        }}
                      >
                        Reschedule
                      </button>
                    </>
                  ) : null}
                  {activity.status === 'skipped' ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        onUnskip(activity)
                      }}
                    >
                      Unskip
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-popover__destructive"
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete(activity)
                    }}
                  >
                    Delete
                  </button>
                </div>
              </SheetPortal>
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
  const [displayNamePromptOpen, setDisplayNamePromptOpen] = useState(true)

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
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null)
  const [teammate, setTeammate] = useState<{
    id: string
    display_name: string
    avatar_emoji: string | null
  } | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ActivityWithOwner | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ActivityWithOwner | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<ActivityWithOwner | null>(null)
  const [moodTarget, setMoodTarget] = useState<ActivityWithOwner | null>(null)
  const [planWeekOpen, setPlanWeekOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [partnerNickname, setPartnerNickname] = useState<string | null>(null)
  const [exitingId, setExitingId] = useState<string | null>(null)
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
      setAvatarEmoji(result.data?.avatar_emoji ?? null)
      setPartnerNickname(result.data?.partner_nickname ?? null)
    })
    void getTeammateProfile(user.id).then((result) => {
      if (!active || result.error) return
      setTeammate(result.data)
    })
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const onProfile = () => {
      void getMyProfile(user.id).then((result) => {
        if (result.data) {
          setDisplayName(result.data.display_name)
          setAvatarEmoji(result.data.avatar_emoji)
          setPartnerNickname(result.data.partner_nickname ?? null)
        }
      })
      void getTeammateProfile(user.id).then((result) => {
        if (!result.error) setTeammate(result.data)
      })
    }
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfile)
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, onProfile)
  }, [user])

  useEffect(() => {
    void loadActivities()
  }, [loadActivities])

  useEffect(() => {
    return subscribeReactions(() => void loadActivities())
  }, [loadActivities])

  useEffect(() => {
    if (!deleteTarget) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setDeleteTarget(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteTarget])

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
      void incrementChallengeProgress(user.id).then(async (completed) => {
        if (!completed) return
        const { default: confetti } = await import('canvas-confetti')
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } })
      })
      void awardAchievements().then((award) => {
        if (award.data?.length) notifyAchievementsAwarded(award.data)
      })
      setMoodTarget(updated)
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

  async function handleUnskip(activity: ActivityWithOwner) {
    const result = await setStatus(activity.id, 'planned', null)
    if (result.error) {
      setError(result.error)
      return
    }
    const updated = result.data!
    setActivities((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
    notifyActivitiesChanged()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const activity = deleteTarget
    setDeleteTarget(null)
    setExitingId(activity.id)
    await new Promise((resolve) => window.setTimeout(resolve, 260))
    const result = await remove(activity.id)
    setExitingId(null)
    if (result.error) {
      setError(result.error)
      return
    }
    if (activity.status === 'done' && user) {
      void decrementChallengeProgressForDone(user.id)
    }
    setActivities((prev) => prev.filter((row) => row.id !== activity.id))
    notifyActivitiesChanged()
  }

  async function handleDelete(activity: ActivityWithOwner) {
    setDeleteTarget(activity)
  }

  async function handlePartialDone(activity: ActivityWithOwner) {
    const result = await markInProgress(activity.id, 50)
    if (result.error) {
      setError(result.error)
      return
    }
    const updated = result.data!
    setActivities((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
    notifyActivitiesChanged()
  }

  async function handleContinueTomorrow(activity: ActivityWithOwner) {
    const result = await continueTomorrow(activity)
    if (result.error) {
      setError(result.error)
      return
    }
    void loadActivities()
    notifyActivitiesChanged()
  }

  async function handleSave(payload: {
    title: string
    notes: string | null
    planned_for: string
    follow_up_on: string | null
    planned_time: string | null
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
    user &&
    !profileLoading &&
    displayName !== null &&
    displayName.trim() === '' &&
    displayNamePromptOpen

  const pageTitle = selectedDate === today ? 'Today' : format(selectedDateObj, 'EEE, d MMM')
  const jumpDateLabel =
    selectedDate === today
      ? format(selectedDateObj, 'd MMM')
      : format(selectedDateObj, 'EEE, d MMM yyyy')
  const teammateLabel = partnerDisplayName({
    myPartnerNickname: partnerNickname,
    theirDisplayName: teammate?.display_name,
  })

  const emptyCopy =
    selectedDate === today
      ? 'Nothing planned. Add something for today.'
      : 'Nothing planned for this day.'

  const youProfile = {
    display_name: displayName ?? '',
    avatar_emoji: avatarEmoji,
  }
  const teammateProfile = {
    display_name: teammate?.display_name ?? '',
    avatar_emoji: teammate?.avatar_emoji ?? null,
  }
  const youPct = user ? productivityForDay(activities, user.id) : null
  const teammatePct = teammate ? productivityForDay(activities, teammate.id) : null
  const showRecap = searchParams.get('recap') === '1' || new Date().getDay() === 0

  async function handleCheer(activity: ActivityWithOwner, emoji: ReactionEmoji) {
    if (!user) return
    const result = await upsertReaction(user.id, activity.id, emoji)
    if (result.error) setError(result.error)
  }

  return (
    <section className="space-y-[var(--space-section)]">
      {showDisplayNamePrompt ? (
        <DisplayNamePrompt
          userId={user.id}
          onSaved={(name) => {
            setDisplayName(name)
            setDisplayNamePromptOpen(true)
          }}
          onDismiss={() => setDisplayNamePromptOpen(false)}
        />
      ) : null}

      <header className="space-y-[var(--space-4)]">
        <div className="space-y-[var(--space-3)]">
          <div>
            <h1 className="typo-large-title text-[var(--color-text)]">{pageTitle}</h1>
            <p className="typo-subhead text-[var(--color-text-muted)]">{headingDate}</p>
            <div ref={titleSentinelRef} className="h-px w-full" aria-hidden />
          </div>
          <div className="flex flex-col gap-[var(--space-2)] sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setPlanWeekOpen(true)}
            >
              Plan my week
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                setEditing(null)
                setSheetOpen(true)
              }}
            >
              Add activity
            </Button>
          </div>
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
          <Button
            type="button"
            variant="tertiary"
            className="inline-flex min-w-0 items-center gap-[var(--space-2)] tabular-nums"
            aria-label="Jump to date"
            onClick={() => setCalendarOpen(true)}
          >
            <Calendar size={18} aria-hidden />
            <span className="truncate">{jumpDateLabel}</span>
          </Button>
        </div>

        {user ? (
          <div className="week-duel-card mb-[var(--space-4)] space-y-[var(--space-3)] border-b border-[var(--color-separator)] pb-[var(--space-4)]">
            <JointStreakCard />
            {showRecap ? <WeeklyRecapCard forceShow={searchParams.get('recap') === '1'} /> : null}
            <DayProgressBar
              label="You"
              activity={youProfile}
              userId={user.id}
              items={activities}
              highlight
            />
            {teammate ? (
              <DayProgressBar
                label={teammateLabel}
                activity={teammateProfile}
                userId={teammate.id}
                items={activities}
              />
            ) : null}
            <div className="mt-[var(--space-3)] border-t border-[var(--color-separator)] pt-[var(--space-2)]">
              <ProductivityDuelStrip
                youPct={youPct}
                teammatePct={teammatePct}
                teammateName={teammateLabel}
              />
            </div>
          </div>
        ) : null}
      </header>

      <DateCalendarSheet
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        value={selectedDate}
        onSelect={setDateInUrl}
      />

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
        <div className="empty-state-card">
          <p>{emptyCopy}</p>
        </div>
      ) : (
        <ul key={selectedDate} className="grouped-list motion-stagger">
          {sorted.map((activity, index) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              isOwn={activity.user_id === user?.id}
              exiting={exitingId === activity.id}
              staggerIndex={index}
              onToggleDone={handleToggleDone}
              onSkip={handleSkip}
              onUnskip={handleUnskip}
              onEdit={(row) => {
                setEditing(row)
                setSheetOpen(true)
              }}
              onDelete={handleDelete}
              onPartialDone={handlePartialDone}
              onContinueTomorrow={handleContinueTomorrow}
              onReschedule={setRescheduleTarget}
              onCheer={handleCheer}
              partnerLabel={teammateLabel}
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

      <PlanWeekSheet open={planWeekOpen} onClose={() => setPlanWeekOpen(false)} />

      <MoodPrompt
        activity={moodTarget}
        onClose={() => setMoodTarget(null)}
        onSaved={(updated) => {
          setActivities((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
        }}
      />

      <RescheduleReasonSheet
        open={Boolean(rescheduleTarget)}
        title="Reschedule activity"
        dateLabel="New date"
        initialDate={rescheduleTarget?.planned_for ?? selectedDate}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={async (date, reason) => {
          if (!rescheduleTarget) return 'Nothing to reschedule'
          const result = await reschedulePlannedFor(rescheduleTarget.id, date, reason)
          if (result.error) return result.error
          const updated = result.data!
          setRescheduleTarget(null)
          if (updated.planned_for === selectedDate) {
            setActivities((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
          } else {
            setActivities((prev) => prev.filter((row) => row.id !== updated.id))
          }
          notifyActivitiesChanged()
          return null
        }}
      />

      {deleteTarget ? (
        <SheetPortal>
          <div
            className="sheet-backdrop"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-activity-title"
            onClick={() => setDeleteTarget(null)}
          >
            <div
              className="sheet-panel w-full max-w-sm space-y-[var(--space-5)] alert-panel-pop"
              onClick={(event) => event.stopPropagation()}
            >
            <h2 id="delete-activity-title" className="typo-title text-[var(--color-text)]">
              Delete this activity?
            </h2>
            <p className="typo-subhead text-[var(--color-text-muted)]">
              This can&apos;t be undone.
            </p>
            <div className="flex flex-col gap-[var(--space-3)] sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                sheet
                className="sm:flex-1"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                sheet
                className="sm:flex-1"
                onClick={() => void confirmDelete()}
              >
                Delete
              </Button>
            </div>
            </div>
          </div>
        </SheetPortal>
      ) : null}
    </section>
  )
}
