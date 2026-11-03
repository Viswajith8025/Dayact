import { useEffect, useState } from 'react'
import {
  ACHIEVEMENTS_AWARDED_EVENT,
  listAchievementCatalog,
  type AchievementDefinition,
} from '../lib/activities'

type ToastItem = AchievementDefinition & { id: string }

function MedalIcon() {
  return (
    <svg className="medal-icon" width="48" height="48" viewBox="0 0 44 44" aria-hidden>
      <polygon
        points="22,6 27,16 38,18 29,26 31,38 22,32 13,38 15,26 6,18 17,16"
        fill="var(--color-accent)"
      />
      <circle cx="22" cy="21" r="8.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
    </svg>
  )
}

export function AchievementCelebrations() {
  const [catalog, setCatalog] = useState<Map<string, AchievementDefinition>>(new Map())
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    void listAchievementCatalog().then((result) => {
      if (result.data) {
        setCatalog(new Map(result.data.map((item) => [item.code, item])))
      }
    })
  }, [])

  useEffect(() => {
    const onAwarded = (event: Event) => {
      const codes = (event as CustomEvent<string[]>).detail ?? []
      void (async () => {
        let map = catalog
        if (map.size === 0) {
          const result = await listAchievementCatalog()
          if (result.data) {
            map = new Map(result.data.map((item) => [item.code, item]))
            setCatalog(map)
          }
        }
        const next: ToastItem[] = []
        for (const code of codes) {
          const def = map.get(code)
          if (def) {
            next.push({ ...def, id: `${code}-${Date.now()}-${Math.random()}` })
          }
        }
        if (next.length === 0) return
        setToasts((prev) => [...prev, ...next])
      })()
    }

    window.addEventListener(ACHIEVEMENTS_AWARDED_EVENT, onAwarded)
    return () => window.removeEventListener(ACHIEVEMENTS_AWARDED_EVENT, onAwarded)
  }, [catalog])

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id))
      }, 3000),
    )
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [toasts])

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[max(var(--space-page),env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-[var(--space-3)] px-[var(--space-page)] md:items-end md:pr-[var(--space-page)]"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="celebration-toast motion-pop flex items-start gap-[var(--space-4)]">
          <MedalIcon />
          <div className="min-w-0">
            <p className="typo-headline text-[var(--color-text)]">{toast.title}</p>
            <p className="mt-[var(--space-1)] typo-subhead text-[var(--color-text-muted)]">
              {toast.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
