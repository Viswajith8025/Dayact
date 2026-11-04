import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './Button'

export function SwUpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        registration.update()
      }
    },
  })

  if (!needRefresh) return null

  return (
    <div
      className="fixed inset-x-[var(--space-page)] top-[calc(env(safe-area-inset-top)+var(--space-2))] z-[40]"
      role="status"
      aria-live="polite"
    >
      <div className="install-prompt__inner flex-wrap items-center justify-between gap-[var(--space-3)]">
        <p className="typo-subhead text-[var(--color-text)]">A new version of Dayact is ready.</p>
        <Button
          type="button"
          onClick={() => {
            void updateServiceWorker(true)
            setNeedRefresh(false)
          }}
        >
          Reload
        </Button>
      </div>
    </div>
  )
}
