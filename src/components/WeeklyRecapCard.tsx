import { format, startOfWeek, endOfWeek } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import {
  computeWeeklyScore,
  getTeammateProfile,
  listActivitiesInRange,
  listOpenFollowups,
  localDateString,
  weekRangeLocal,
} from '../lib/activities'
import { useAuth } from '../lib/auth'
import { fetchJointStreak } from '../lib/streaks'

type WeeklyRecapCardProps = {
  forceShow?: boolean
}

export function WeeklyRecapCard({ forceShow }: WeeklyRecapCardProps) {
  const { user } = useAuth()
  const cardRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [summary, setSummary] = useState('')
  const [shareState, setShareState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [shareMessage, setShareMessage] = useState<string | null>(null)

  useEffect(() => {
    const day = new Date().getDay()
    setVisible(forceShow || day === 0)
  }, [forceShow])

  useEffect(() => {
    if (!visible || !user) return
    const { from, to } = weekRangeLocal()
    void Promise.all([
      listActivitiesInRange(from, to),
      listOpenFollowups(),
      getTeammateProfile(user.id),
      fetchJointStreak(),
    ]).then(([acts, follow, mate, streak]) => {
      const items = acts.data ?? []
      const you = computeWeeklyScore(items, follow.data ?? [], user.id, from, to)
      const them =
        mate.data && items.length
          ? computeWeeklyScore(items, follow.data ?? [], mate.data.id, from, to)
          : null
      setSummary(
        `Week ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'd MMM')}–${format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'd MMM')}: You ${you.total} pts${them ? ` · ${mate.data!.display_name || 'Teammate'} ${them.total}` : ''}. Joint streak ${streak.data?.current ?? 0} (best ${streak.data?.best ?? 0}).`,
      )
    })
  }, [visible, user])

  if (!visible) return null

  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function shareCard() {
    const el = cardRef.current
    if (!el) return
    setShareState('working')
    setShareMessage(null)
    try {
      const { toBlob } = await import('html-to-image')
      const blob = await toBlob(el, { pixelRatio: 2, cacheBust: true, type: 'image/png' })
      if (!blob) throw new Error('empty blob')
      const fileName = `dayact-recap-${localDateString()}.png`
      const file = new File([blob], fileName, { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title: 'Dayact weekly recap', files: [file] })
          setShareState('done')
          setShareMessage('Shared.')
          return
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === 'AbortError') {
            setShareState('idle')
            return
          }
        }
      }

      downloadBlob(blob, fileName)
      setShareState('done')
      setShareMessage('Downloaded PNG.')
    } catch {
      setShareState('error')
      setShareMessage('Could not create the recap image. Try again.')
    }
  }

  return (
    <section className="week-duel-card space-y-[var(--space-3)]" aria-label="Weekly recap">
      <div ref={cardRef} className="space-y-[var(--space-2)]">
        <h2 className="typo-headline text-[var(--color-text)]">Weekly recap</h2>
        <p className="typo-subhead text-[var(--color-text-muted)]">{summary || 'Loading recap…'}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        loading={shareState === 'working'}
        onClick={() => void shareCard()}
      >
        Share recap
      </Button>
      {shareMessage ? (
        <p
          role="status"
          className={`typo-footnote ${shareState === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}
        >
          {shareMessage}
        </p>
      ) : null}
    </section>
  )
}
