export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'dayact-theme'

export function readStoredPreference(): ThemePreference | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  return null
}

/** First visit: light on phones for readability; otherwise follow the OS. */
export function defaultPreferenceForDevice(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  if (window.matchMedia('(max-width: 767px)').matches) return 'light'
  return 'system'
}

export function getInitialPreference(): ThemePreference {
  return readStoredPreference() ?? defaultPreferenceForDevice()
}

export function resolveEffectiveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'light') return 'light'
  if (preference === 'dark') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement
  if (preference === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', preference)
  }
  const effective = resolveEffectiveTheme(preference)
  root.style.colorScheme = effective
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', effective === 'dark' ? '#1e1e22' : '#f2f2f5')
}

export function persistPreference(preference: ThemePreference): void {
  localStorage.setItem(STORAGE_KEY, preference)
}

export function initTheme(): void {
  applyThemePreference(getInitialPreference())
}
