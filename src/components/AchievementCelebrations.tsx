import { useEffect, useState } from 'react'
import {
  ACHIEVEMENTS_AWARDED_EVENT,
  listAchievementCatalog,
  type AchievementDefinition,
} from '../lib/activities'

type ToastItem = AchievementDefinition & { id: string }

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
      }, 4200),
    )
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [toasts])

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[var(--space-page)] z-[60] flex flex-col items-center gap-[var(--space-3)] px-[var(--space-page)] md:items-end md:pr-[var(--space-section)]"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-[var(--space-5)] py-[var(--space-4)] shadow-lg ring-1 ring-[var(--color-border)]"
        >
          <p className="text-[var(--text-sm)] font-medium leading-[var(--leading-tight)] text-[var(--color-accent)]">
            Achievement unlocked
          </p>
          <p className="mt-[var(--space-1)] text-[var(--text-base)] font-medium leading-[var(--leading-tight)] text-[var(--color-text)]">
            {toast.title}
          </p>
          <p className="mt-[var(--space-2)] text-[var(--text-sm)] leading-[var(--leading-relaxed)] text-[var(--color-text-muted)]">
            {toast.description}
          </p>
        </div>
      ))}
    </div>
  )
}
