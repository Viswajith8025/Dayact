import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
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
  { to: '/followups', label: 'Followups', icon: ListChecks, badge: true },
  { to: '/achievements', label: 'Achievements', icon: Trophy },
] as const

function navLinkClass(isActive: boolean, layout: 'sidebar' | 'tabs') {
  const base =
    layout === 'tabs'
      ? 'relative flex min-h-[var(--touch-min)] flex-1 flex-col items-center justify-center gap-[var(--space-1)] text-[var(--text-xs)] leading-[var(--leading-tight)]'
      : 'relative flex min-h-[var(--touch-min)] items-center gap-[var(--space-3)] rounded-[var(--radius-md)] px-[var(--space-4)] text-[var(--text-sm)] leading-[var(--leading-normal)]'

  const state = isActive
    ? 'text-[var(--color-accent)] font-medium'
    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'

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
            <span className="inline-flex items-center gap-[var(--space-2)]">
              {label}
              {showBadge ? (
                <span
                  className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 text-[0.6875rem] font-medium leading-none text-[var(--color-accent-foreground)]"
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

  const versionClass =
    'text-[var(--text-xs)] leading-[var(--leading-tight)] text-[var(--color-text-muted)]'

  if (layout === 'sidebar') {
    return (
      <div className="mt-auto flex flex-col gap-[var(--space-3)] border-t border-[var(--color-border)] pt-[var(--space-4)]">
        <div className="flex items-center justify-between gap-[var(--space-2)]">
          <span className={versionClass}>{APP_VERSION}</span>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="inline-flex min-h-[var(--touch-min)] items-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <LogOut size={18} strokeWidth={1.75} aria-hidden />
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[var(--space-2)] border-t border-[var(--color-border)] p-[var(--space-3)]">
      <span className={versionClass}>{APP_VERSION}</span>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
        className="inline-flex min-h-[var(--touch-min)] w-full items-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-[var(--space-2)] text-left text-[var(--text-sm)] text-[var(--color-text)]"
      >
        <LogOut size={18} strokeWidth={1.75} aria-hidden />
        Sign out
      </button>
    </div>
  )
}

export function AppShell() {
  const { user } = useAuth()
  const [followUpBadge, setFollowUpBadge] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)] md:flex-row">
      <AchievementCelebrations />
      <aside className="hidden w-56 shrink-0 flex-col gap-[var(--space-2)] bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-6)] md:flex">
        <p className="mb-[var(--space-4)] text-[var(--text-lg)] font-medium leading-[var(--leading-tight)] text-[var(--color-text)]">
          Dayact
        </p>
        <nav className="flex flex-col gap-[var(--space-1)]" aria-label="Main">
          <AppNav layout="sidebar" followUpBadge={followUpBadge} />
        </nav>
        <SessionFooter layout="sidebar" />
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-page)] py-[var(--space-3)] pt-[max(var(--space-3),env(safe-area-inset-top))] md:hidden">
          <p className="text-[var(--text-lg)] font-medium leading-[var(--leading-tight)] text-[var(--color-text)]">
            Dayact
          </p>
          <div className="relative">
            <button
              type="button"
              className="inline-flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text)]"
              aria-expanded={mobileMenuOpen}
              aria-haspopup="true"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? (
                <X size={22} strokeWidth={1.75} aria-hidden />
              ) : (
                <Menu size={22} strokeWidth={1.75} aria-hidden />
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
                <div className="absolute right-0 top-full z-20 mt-[var(--space-2)] w-48 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
                  <SessionFooter layout="header-menu" />
                </div>
              </>
            ) : null}
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-[var(--space-page)] pb-[calc(var(--nav-height)+var(--space-6))] pt-[var(--space-section)] md:pb-[var(--space-section)] md:pt-[var(--space-section)]">
          <ConnectionGate>
            <Outlet />
          </ConnectionGate>
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 flex border-t border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-2)] pb-[env(safe-area-inset-bottom)] md:hidden"
          style={{ minHeight: 'var(--nav-height)' }}
          aria-label="Main"
        >
          <AppNav layout="tabs" followUpBadge={followUpBadge} />
        </nav>
      </div>
    </div>
  )
}
