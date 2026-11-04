import { Download, Share, X } from 'lucide-react'
import { Button } from './Button'
import { useInstall, useInstallOfferVisible } from '../lib/install'

export function InstallPromptBar({ anchor = 'tabs' }: { anchor?: 'tabs' | 'screen' | 'top' }) {
  const visible = useInstallOfferVisible()
  const { canPromptInstall, showIosHelp, promptInstall, dismissInstallOffer } = useInstall()

  if (!visible) return null

  const positionStyle =
    anchor === 'top'
      ? { top: 'calc(env(safe-area-inset-top) + var(--space-2))' as const }
      : {
          bottom:
            anchor === 'tabs'
              ? 'calc(var(--nav-height) + env(safe-area-inset-bottom) + var(--space-6) + var(--space-2))'
              : 'max(env(safe-area-inset-bottom), var(--space-4))',
        }

  return (
    <div
      className={`install-prompt fixed inset-x-[var(--space-page)] z-[25]${anchor === 'tabs' || anchor === 'top' ? ' md:hidden' : ''}`}
      style={positionStyle}
      role="region"
      aria-label="Install Dayact"
    >
      <div className="install-prompt__inner">
        <div className="min-w-0 flex-1 space-y-[var(--space-1)]">
          <p className="typo-subhead font-semibold text-[var(--color-text)]">Install Dayact</p>
          {canPromptInstall ? (
            <p className="typo-footnote text-[var(--color-text-muted)]">
              Add to your home screen for quick access and follow-up reminders.
            </p>
          ) : showIosHelp ? (
            <p className="typo-footnote text-[var(--color-text-muted)] inline-flex items-center gap-1">
              <Share size={14} aria-hidden />
              Tap Share, then &quot;Add to Home Screen&quot;.
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-[var(--space-2)]">
          {canPromptInstall ? (
            <Button type="button" onClick={() => void promptInstall()}>
              Install
            </Button>
          ) : null}
          <button
            type="button"
            className="btn btn--icon btn--tertiary"
            aria-label="Snooze install hint"
            onClick={dismissInstallOffer}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}

export function InstallHeaderPill() {
  const { pillVisible, canPromptInstall, showIosHelp, promptInstall } = useInstall()
  if (!pillVisible) return null

  return (
    <button
      type="button"
      className="install-pill"
      onClick={() => {
        if (canPromptInstall) void promptInstall()
      }}
      title={showIosHelp && !canPromptInstall ? 'Share → Add to Home Screen' : 'Install Dayact'}
    >
      <Download size={14} aria-hidden />
      Install
    </button>
  )
}

export function InstallMenuAction() {
  const { canPromptInstall, isStandalone, promptInstall } = useInstall()

  if (isStandalone) return null

  return (
    <button
      type="button"
      className="btn btn--tertiary w-full justify-start"
      onClick={() => {
        if (canPromptInstall) void promptInstall()
      }}
    >
      <Download size={18} strokeWidth={1.75} aria-hidden />
      {canPromptInstall ? 'Install app' : 'Install: Share → Add to Home Screen'}
    </button>
  )
}
