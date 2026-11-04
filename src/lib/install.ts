import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const SNOOZE_KEY = 'dayact-install-snooze-until'
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallContextValue = {
  canPromptInstall: boolean
  showIosHelp: boolean
  isStandalone: boolean
  barVisible: boolean
  pillVisible: boolean
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

function readSnoozed(): boolean {
  const raw = localStorage.getItem(SNOOZE_KEY)
  if (!raw) return false
  const until = Number(raw)
  if (!Number.isFinite(until) || until <= Date.now()) {
    localStorage.removeItem(SNOOZE_KEY)
    return false
  }
  return true
}

export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [snoozed, setSnoozed] = useState(() => readSnoozed())
  const standalone = isStandaloneDisplay()
  const ios = isIosDevice()

  useEffect(() => {
    if (standalone) return

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [standalone])

  const dismissInstallOffer = useCallback(() => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
    setSnoozed(true)
    setDeferred(null)
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    setDeferred(null)
    dismissInstallOffer()
  }, [deferred, dismissInstallOffer])

  const canInstall = !standalone && (Boolean(deferred) || ios)
  const barVisible = canInstall && !snoozed && (Boolean(deferred) || ios)
  const pillVisible = canInstall && snoozed

  const value = useMemo(
    () => ({
      canPromptInstall: Boolean(deferred) && !standalone,
      showIosHelp: ios && !standalone,
      isStandalone: standalone,
      barVisible,
      pillVisible,
      promptInstall,
      dismissInstallOffer,
    }),
    [deferred, ios, standalone, barVisible, pillVisible, promptInstall, dismissInstallOffer],
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
  const { barVisible } = useInstall()
  return barVisible
}
