import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, ListChecks, LogOut, Menu, Trophy, X } from 'lucide-react'
import { AchievementCelebrations } from './AchievementCelebrations'
import { ConnectionGate } from './ConnectionGate'
import { DayactBrand } from './DayactBrand'
import { InstallHeaderPill, InstallMenuAction, InstallPromptBar } from './InstallPrompt'
import { useInstall } from '../lib/install'
import { ProfileSheet } from './ProfileSheet'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../lib/auth'
import {
  ACTIVITIES_CHANGED_EVENT,
  countOwnFollowUpBadge,
  ensureDefaultPartnerLink,
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
      ? 'text-[var(--color-accent)] tab-nav-link--active'
      : 'bg-[var(--color-accent-tint)] text-[var(--color-accent)] font-semibold'
    : layout === 'tabs'
      ? ''
      : 'text-[var(--color-text-muted)]'

  const tabClass = layout === 'tabs' ? ' tab-nav-link' : ''

  return `${base}${tabClass} ${state}`
}

function AppNav({
  layout,
  followUpBadge,
  badgePop,
}: {
  layout: 'sidebar' | 'tabs'
  followUpBadge: number
  badgePop: boolean
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
                  className={`tabular-nums inline-flex min-h-5 min-w-5 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-accent)] px-1.5 typo-caption text-[var(--color-accent-foreground)]${badgePop ? ' motion-pop' : ''}`}
                  aria-label={
                    followUpBadge === 1
                      ? '1 follow-up due'
                      : `${followUpBadge} follow-ups due`
                  }
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

function SessionFooter({
  layout,
  onOpenProfile,
}: {
  layout: 'sidebar' | 'header-menu'
  onOpenProfile: () => void
}) {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    navigate('/login', { replace: true })
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  if (layout === 'sidebar') {
    return (
      <div className="mt-auto space-y-[var(--space-4)] border-t border-[var(--color-separator)] pt-[var(--space-4)]">
        <button type="button" className="btn btn--tertiary w-full justify-start" onClick={onOpenProfile}>
          Profile
        </button>
        <NavLink to="/challenges" className="btn btn--tertiary w-full justify-start">
          Challenges
        </NavLink>
        <NavLink to="/heatmap" className="btn btn--tertiary w-full justify-start">
          Heatmap
        </NavLink>
        <NavLink to="/recap?recap=1" className="btn btn--tertiary w-full justify-start">
          Weekly recap
        </NavLink>
        <ThemeToggle />
        <InstallMenuAction />
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
    <div className="flex w-56 flex-col gap-[var(--space-3)] p-[var(--space-3)]">
      <button type="button" className="btn btn--tertiary w-full justify-start" onClick={onOpenProfile}>
        Profile
      </button>
      <NavLink to="/challenges" className="btn btn--tertiary w-full justify-start">
        Challenges
      </NavLink>
      <NavLink to="/heatmap" className="btn btn--tertiary w-full justify-start">
        Heatmap
      </NavLink>
      <NavLink to="/recap?recap=1" className="btn btn--tertiary w-full justify-start">
        Weekly recap
      </NavLink>
      <ThemeToggle />
      <InstallMenuAction />
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
  const { barVisible: installBarVisible } = useInstall()
  const location = useLocation()
  const [followUpBadge, setFollowUpBadge] = useState(0)
  const [badgePop, setBadgePop] = useState(false)
  const prevBadgeRef = useRef(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [compactTitle, setCompactTitle] = useState(false)

  const openProfile = useCallback(() => {
    setMobileMenuOpen(false)
    setProfileOpen(true)
  }, [])

  const pageTitle = routeTitles[location.pathname] ?? 'Dayact'

  const refreshBadge = useCallback(async () => {
    if (!user) {
      setFollowUpBadge(0)
      return
    }
    const result = await countOwnFollowUpBadge(user.id)
    if (!result.error) {
      const next = result.data ?? 0
      setFollowUpBadge(next)
      if (next > prevBadgeRef.current) {
        setBadgePop(true)
        window.setTimeout(() => setBadgePop(false), 200)
      }
      prevBadgeRef.current = next
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    void ensureDefaultPartnerLink()
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
    <div className="app-shell flex min-h-dvh flex-col md:flex-row">
      <AchievementCelebrations />
      <aside className="hidden w-56 shrink-0 flex-col px-[var(--space-4)] py-[var(--space-6)] md:flex">
        <DayactBrand className="mb-[var(--space-5)]" />
        <nav className="flex flex-col gap-[var(--space-1)]" aria-label="Main">
          <AppNav layout="sidebar" followUpBadge={followUpBadge} badgePop={badgePop} />
        </nav>
        <SessionFooter layout="sidebar" onOpenProfile={openProfile} />
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
        <header className="glass-bar sticky top-0 z-20 flex items-center justify-between px-[var(--space-page)] py-[var(--space-2)] pt-[max(var(--space-2),env(safe-area-inset-top))] md:hidden">
          {compactTitle ? (
            <>
              <div className={mobileMenuOpen ? 'relative z-30' : 'relative'}>
                <button
                  type="button"
                  className="btn btn--icon btn--tertiary relative z-30"
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
                    <div className="menu-popover menu-popover--motion absolute left-0 top-full z-20 mt-[var(--space-2)] w-56">
                      <SessionFooter layout="header-menu" onOpenProfile={openProfile} />
                    </div>
                  </>
                ) : null}
              </div>
              <p className="typo-headline absolute left-1/2 -translate-x-1/2 text-[var(--color-text)]">
                {pageTitle}
              </p>
              <InstallHeaderPill />
            </>
          ) : (
            <>
              <DayactBrand />
              <div className="flex items-center gap-[var(--space-2)]">
                <InstallHeaderPill />
                <div className={mobileMenuOpen ? 'relative z-30' : 'relative'}>
                <button
                  type="button"
                  className="btn btn--icon btn--tertiary relative z-30"
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
                    <div className="menu-popover menu-popover--motion absolute right-0 top-full z-20 mt-[var(--space-2)] w-56">
                      <SessionFooter layout="header-menu" onOpenProfile={openProfile} />
                    </div>
                  </>
                ) : null}
                </div>
              </div>
            </>
          )}
        </header>
        <main
          className={`mx-auto w-full max-w-[var(--content-max)] flex-1 px-[var(--space-page)] pb-[calc(var(--nav-height)+env(safe-area-inset-bottom)+var(--space-6)+4rem)] pt-[var(--space-4)] md:pb-[var(--space-section)] md:pt-[var(--space-section)]${installBarVisible ? ' max-md:pt-[calc(var(--space-4)+3.25rem)]' : ''}`}
        >
          <ConnectionGate>
            <div key={location.pathname} className="motion-page-enter">
              <Outlet />
            </div>
          </ConnectionGate>
        </main>

        <nav
          className="glass-bar fixed inset-x-0 bottom-0 z-20 flex px-[var(--space-2)] pb-[calc(env(safe-area-inset-bottom)+var(--space-6))] md:hidden"
          style={{ minHeight: 'calc(var(--nav-height) + env(safe-area-inset-bottom) + var(--space-6))' }}
          aria-label="Main"
        >
          <AppNav layout="tabs" followUpBadge={followUpBadge} badgePop={badgePop} />
        </nav>
        <InstallPromptBar anchor="top" />
      </div>
    </div>
  )
}
