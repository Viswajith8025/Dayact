import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, ListChecks, LogOut, Menu, Trophy, X } from 'lucide-react'
import { AchievementCelebrations } from './AchievementCelebrations'
import { ConnectionGate } from './ConnectionGate'
import { useAuth } from '../lib/auth'
import {
  ACTIVITIES_CHANGED_EVENT,
  countOwnFollowUpBadge,
} from '../lib/activities'
import { signOut } from '../lib/auth'
import { APP_VERSION } from '../lib/version'

const navItems = [
  { to: '/today', label: 'Today', icon: CalendarDays },
  { to: '/followups', label: 'Follow-ups', icon: ListChecks, badge: true },
  { to: '/achievements', label: 'Achievements', icon: Trophy },
] as const

const routeTitles: Record<string, string> = {
  '/today': 'Today',
  '/followups': 'Follow-ups',
  '/achievements': 'Achievements',
}

function navLinkClass(isActive: boolean, layout: 'sidebar' | 'tabs') {
  const base =
    layout === 'tabs'
      ? 'relative flex min-h-[var(--nav-height)] flex-1 flex-col items-center justify-center gap-[var(--space-1)] typo-caption text-[var(--color-text-muted)]'
      : 'relative flex min-h-[var(--touch-min)] items-center gap-[var(--space-3)] rounded-[var(--radius-control)] px-[var(--space-3)] typo-subhead'

  const state = isActive
    ? layout === 'tabs'
      ? 'text-[var(--color-accent)]'
      : 'bg-[var(--color-accent-tint)] text-[var(--color-accent)] font-semibold'
    : layout === 'tabs'
      ? ''
      : 'text-[var(--color-text-muted)]'

  return `${base} ${state}`
}

function AppNav({
  layout,
  followUpBadge,
}: {
  layout: 'sidebar' | 'tabs'
  followUpBadge: number
}) {
  return (
    <>
      {navItems.map(({ to, label, icon: Icon, ...rest }) => {
        const showBadge = 'badge' in rest && rest.badge && followUpBadge > 0
        return (
          <NavLink key={to} to={to} className={({ isActive }) => navLinkClass(isActive, layout)}>
            <Icon size={layout === 'tabs' ? 22 : 20} strokeWidth={1.75} aria-hidden />
            <span className="inline-flex items-center gap-[var(--space-2)] select-none">
              {label}
              {showBadge ? (
                <span
                  className="tabular-nums inline-flex min-h-5 min-w-5 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-accent)] px-1.5 typo-caption text-[var(--color-accent-foreground)]"
                  aria-label={`${followUpBadge} follow-ups due`}
                >
                  {followUpBadge}
                </span>
              ) : null}
            </span>
          </NavLink>
        )
      })}
    </>
  )
}

function SessionFooter({ layout }: { layout: 'sidebar' | 'header-menu' }) {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  if (layout === 'sidebar') {
    return (
      <div className="mt-auto border-t border-[var(--color-separator)] pt-[var(--space-4)]">
        <div className="flex items-center justify-between gap-[var(--space-2)]">
          <span className="typo-footnote text-[var(--color-text-muted)] tabular-nums">{APP_VERSION}</span>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="btn btn--tertiary px-[var(--space-2)]"
          >
            <LogOut size={18} strokeWidth={1.75} aria-hidden />
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[var(--space-2)] p-[var(--space-3)]">
      <span className="typo-footnote text-[var(--color-text-muted)] tabular-nums">{APP_VERSION}</span>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
        className="btn btn--tertiary w-full justify-start"
      >
        <LogOut size={18} strokeWidth={1.75} aria-hidden />
        Sign out
      </button>
    </div>
  )
}

export function AppShell() {
  const { user } = useAuth()
  const location = useLocation()
  const [followUpBadge, setFollowUpBadge] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [compactTitle, setCompactTitle] = useState(false)

  const pageTitle = routeTitles[location.pathname] ?? 'Dayact'

  const refreshBadge = useCallback(async () => {
    if (!user) {
      setFollowUpBadge(0)
      return
    }
    const result = await countOwnFollowUpBadge(user.id)
    if (!result.error) {
      setFollowUpBadge(result.data ?? 0)
    }
  }, [user])

  useEffect(() => {
    void refreshBadge()
  }, [refreshBadge])

  useEffect(() => {
    const onChange = () => {
      void refreshBadge()
    }
    window.addEventListener(ACTIVITIES_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(ACTIVITIES_CHANGED_EVENT, onChange)
  }, [refreshBadge])

  useEffect(() => {
    setCompactTitle(false)
  }, [location.pathname])

  useEffect(() => {
    const onCompact = (event: Event) => {
      setCompactTitle(Boolean((event as CustomEvent<boolean>).detail))
    }
    window.addEventListener('dayact:title-compact', onCompact)
    return () => window.removeEventListener('dayact:title-compact', onCompact)
  }, [])

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-[var(--color-bg)] md:flex-row">
      <AchievementCelebrations />
      <aside className="hidden w-56 shrink-0 flex-col bg-[var(--color-bg)] px-[var(--space-4)] py-[var(--space-6)] md:flex">
        <p className="mb-[var(--space-5)] typo-title text-[var(--color-text)]">Dayact</p>
        <nav className="flex flex-col gap-[var(--space-1)]" aria-label="Main">
          <AppNav layout="sidebar" followUpBadge={followUpBadge} />
        </nav>
        <SessionFooter layout="sidebar" />
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="glass-bar sticky top-0 z-20 flex items-center justify-between px-[var(--space-page)] py-[var(--space-2)] pt-[max(var(--space-2),env(safe-area-inset-top))] md:hidden">
          {compactTitle ? (
            <>
              <div className="relative">
                <button
                  type="button"
                  className="btn btn--icon btn--tertiary"
                  aria-expanded={mobileMenuOpen}
                  aria-haspopup="true"
                  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                  onClick={() => setMobileMenuOpen((open) => !open)}
                >
                  {mobileMenuOpen ? (
                    <X size={20} strokeWidth={1.75} aria-hidden />
                  ) : (
                    <Menu size={20} strokeWidth={1.75} aria-hidden />
                  )}
                </button>
                {mobileMenuOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 bg-transparent"
                      aria-label="Close menu"
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <div className="menu-popover absolute left-0 top-full z-20 mt-[var(--space-2)] w-48">
                      <SessionFooter layout="header-menu" />
                    </div>
                  </>
                ) : null}
              </div>
              <p className="typo-headline absolute left-1/2 -translate-x-1/2 text-[var(--color-text)]">
                {pageTitle}
              </p>
              <div className="w-[var(--touch-min)]" aria-hidden />
            </>
          ) : (
            <>
              <p className="typo-headline text-[var(--color-text)]">Dayact</p>
              <div className="relative">
                <button
                  type="button"
                  className="btn btn--icon btn--tertiary"
                  aria-expanded={mobileMenuOpen}
                  aria-haspopup="true"
                  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                  onClick={() => setMobileMenuOpen((open) => !open)}
                >
                  {mobileMenuOpen ? (
                    <X size={20} strokeWidth={1.75} aria-hidden />
                  ) : (
                    <Menu size={20} strokeWidth={1.75} aria-hidden />
                  )}
                </button>
                {mobileMenuOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 bg-transparent"
                      aria-label="Close menu"
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <div className="menu-popover absolute right-0 top-full z-20 mt-[var(--space-2)] w-48">
                      <SessionFooter layout="header-menu" />
                    </div>
                  </>
                ) : null}
              </div>
            </>
          )}
        </header>
        <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 px-[var(--space-page)] pb-[calc(var(--nav-height)+env(safe-area-inset-bottom)+var(--space-6))] pt-[var(--space-4)] md:pb-[var(--space-section)] md:pt-[var(--space-section)]">
          <ConnectionGate>
            <Outlet />
          </ConnectionGate>
        </main>

        <nav
          className="glass-bar fixed inset-x-0 bottom-0 z-20 flex px-[var(--space-2)] pb-[env(safe-area-inset-bottom)] md:hidden"
          style={{ minHeight: 'calc(var(--nav-height) + env(safe-area-inset-bottom))' }}
          aria-label="Main"
        >
          <AppNav layout="tabs" followUpBadge={followUpBadge} />
        </nav>
      </div>
    </div>
  )
}
