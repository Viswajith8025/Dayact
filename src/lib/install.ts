import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const DISMISS_KEY = 'dayact-install-dismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallContextValue = {
  canPromptInstall: boolean
  showIosHelp: boolean
  isStandalone: boolean
  promptInstall: () => Promise<void>
  dismissInstallOffer: () => void
}

const InstallContext = createContext<InstallContextValue | null>(null)

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const standalone = isStandaloneDisplay()
  const ios = isIosDevice()

  useEffect(() => {
    if (standalone || dismissed) return

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [standalone, dismissed])

  const dismissInstallOffer = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
    setDeferred(null)
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    setDeferred(null)
    dismissInstallOffer()
  }, [deferred, dismissInstallOffer])

  const value = useMemo(
    () => ({
      canPromptInstall: Boolean(deferred) && !standalone && !dismissed,
      showIosHelp: ios && !standalone && !dismissed,
      isStandalone: standalone,
      promptInstall,
      dismissInstallOffer,
    }),
    [deferred, dismissed, ios, standalone, promptInstall, dismissInstallOffer],
  )

  return createElement(InstallContext.Provider, { value }, children)
}

export function useInstall(): InstallContextValue {
  const ctx = useContext(InstallContext)
  if (!ctx) {
    throw new Error('useInstall must be used within InstallProvider')
  }
  return ctx
}

export function useInstallOfferVisible(): boolean {
  const { canPromptInstall, showIosHelp, isStandalone } = useInstall()
  return !isStandalone && (canPromptInstall || showIosHelp)
}
