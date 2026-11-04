import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useAuth } from '../lib/auth'
import {
  cancelChallenge,
  createChallenge,
  deleteChallenge,
  listChallengeProgress,
  listChallenges,
  type Challenge,
  type ChallengeProgress,
} from '../lib/challenges'
import { getMyProfile, getTeammateProfile, localDateString } from '../lib/activities'
import { partnerDisplayName } from '../lib/partnerLabel'
import { PROFILE_UPDATED_EVENT } from '../components/ProfileSheet'

export function ChallengesPage() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [progress, setProgress] = useState<Map<string, ChallengeProgress[]>>(new Map())
  const [partnerLabel, setPartnerLabel] = useState('Partner')
  const [partnerNickname, setPartnerNickname] = useState<string | null>(null)
  const [teammateName, setTeammateName] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState(5)
  const [days, setDays] = useState(7)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    const result = await listChallenges()
    if (result.error) {
      setError(result.error)
      return
    }
    setChallenges(result.data)
    const map = await listChallengeProgress(result.data.map((c) => c.id))
    setProgress(map)
  }

  useEffect(() => {
    if (!user) return
    void getMyProfile(user.id).then((result) => {
      if (result.data) setPartnerNickname(result.data.partner_nickname ?? null)
    })
    void getTeammateProfile(user.id).then((result) => {
      if (result.data?.display_name) setTeammateName(result.data.display_name)
    })
    const onProfile = () => {
      void getMyProfile(user.id).then((result) => {
        if (result.data) setPartnerNickname(result.data.partner_nickname ?? null)
      })
    }
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfile)
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, onProfile)
  }, [user])

  useEffect(() => {
    setPartnerLabel(
      partnerDisplayName({
        myPartnerNickname: partnerNickname,
        theirDisplayName: teammateName,
      }),
    )
  }, [partnerNickname, teammateName])

  useEffect(() => {
    void load()
  }, [])

  async function handleCreate() {
    if (!user || creating) return
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Add a challenge title.')
      return
    }
    setCreating(true)
    setError(null)
    const result = await createChallenge({
      userId: user.id,
      title: trimmed,
      targetCount: target,
      durationDays: days,
      startDate: localDateString(),
    })
    setCreating(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setTitle('')
    await load()
  }

  async function handleCancel(id: string) {
    setError(null)
    const result = await cancelChallenge(id)
    if (result.error) {
      setError(result.error)
      return
    }
    await load()
  }

  async function handleDelete(id: string) {
    setError(null)
    const result = await deleteChallenge(id)
    if (result.error) {
      setError(result.error)
      return
    }
    await load()
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
        <Button type="button" loading={creating} onClick={() => void handleCreate()}>
          Start challenge
        </Button>
      </div>

      <ul className="grouped-list">
        {challenges.map((c) => (
          <ChallengeRow
            key={c.id}
            challenge={c}
            rows={progress.get(c.id) ?? []}
            userId={user?.id}
            partnerLabel={partnerLabel}
            canManage={c.created_by === user?.id}
            onCancel={() => void handleCancel(c.id)}
            onDelete={() => void handleDelete(c.id)}
          />
        ))}
      </ul>
    </section>
  )
}

function ChallengeRow({
  challenge: c,
  rows,
  userId,
  partnerLabel,
  canManage,
  onCancel,
  onDelete,
}: {
  challenge: Challenge
  rows: ChallengeProgress[]
  userId: string | undefined
  partnerLabel: string
  canManage: boolean
  onCancel: () => void
  onDelete: () => void
}) {
  const you = rows.find((row) => row.user_id === userId)
  const partner = rows.find((row) => row.user_id !== userId)

  const columns = useMemo(
    () =>
      [
        { key: 'you', label: 'You', row: you },
        { key: 'partner', label: partnerLabel, row: partner },
      ] as const,
    [you, partner, partnerLabel],
  )

  return (
    <li className="grouped-row flex-col items-stretch gap-[var(--space-3)]">
      <div className="flex flex-wrap items-start justify-between gap-[var(--space-2)]">
        <div>
          <p className="typo-headline text-[var(--color-text)]">{c.title}</p>
          <p className="typo-footnote text-[var(--color-text-muted)]">
            {c.status} · target {c.target_count} in {c.duration_days} days
          </p>
        </div>
        {canManage && c.status === 'active' ? (
          <Button type="button" variant="tertiary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        {canManage && (c.status === 'cancelled' || c.status === 'completed') ? (
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-[var(--space-3)]">
        {columns.map(({ key, label, row }) => (
          <div key={key} className="space-y-[var(--space-1)] min-w-0">
            <p className="typo-footnote text-[var(--color-text-muted)]">
              {label}
              <span className="tabular-nums text-[var(--color-text)]">
                {' '}
                · {row?.done_count ?? 0} / {c.target_count}
              </span>
            </p>
            <div className="day-progress__track">
              <div
                className="day-progress__fill"
                style={{
                  width: `${Math.min(100, ((row?.done_count ?? 0) / c.target_count) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </li>
  )
}
