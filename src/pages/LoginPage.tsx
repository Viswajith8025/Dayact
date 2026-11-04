import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ConnectionGate } from '../components/ConnectionGate'
import { DayactBrand } from '../components/DayactBrand'
import { Input } from '../components/Input'
import { ThemeToggle } from '../components/ThemeToggle'
import { InstallPromptBar } from '../components/InstallPrompt'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

function LoginSkeleton() {
  return (
    <div className="space-y-[var(--space-5)] rounded-[var(--radius-group)] bg-[var(--color-surface)] p-[var(--space-6)]" aria-hidden>
      <div className="skeleton-block h-11 w-full" />
      <div className="skeleton-block h-11 w-full" />
      <div className="skeleton-block h-11 w-full" />
    </div>
  )
}

export function LoginPage() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex min-h-dvh items-start justify-center bg-[var(--color-bg)] px-[var(--space-page)] py-[var(--space-section)] pt-[max(var(--space-section),env(safe-area-inset-top))]">
        <div className="w-full max-w-md space-y-[var(--space-section)]">
          <header className="space-y-[var(--space-2)]">
            <div className="skeleton-block h-8 w-32" />
            <div className="skeleton-block h-4 w-full max-w-sm" />
          </header>
          <LoginSkeleton />
        </div>
      </div>
    )
  }

  if (session) {
    return <Navigate to="/today" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setSubmitting(false)

    if (signInError || !data.session) {
      setError(signInError?.message ?? 'Check your email and password, then try again.')
    }
  }

  return (
    <div className="flex min-h-dvh items-start justify-center bg-[var(--color-bg)] px-[var(--space-page)] py-[var(--space-section)] pt-[max(var(--space-section),env(safe-area-inset-top))]">
      <div className="w-full max-w-md space-y-[var(--space-section)]">
        <header className="space-y-[var(--space-3)]">
          <DayactBrand size="hero" />
          <p className="typo-subhead text-[var(--color-text-muted)]">
            Sign in with the account your team owner created for you.
          </p>
          <ThemeToggle />
        </header>

        <ConnectionGate>
          <form
            className="space-y-[var(--space-5)] rounded-[var(--radius-group)] bg-[var(--color-surface)] p-[var(--space-page)]"
            onSubmit={handleSubmit}
          >
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error ? (
              <p role="alert" aria-live="assertive" className="typo-subhead text-[var(--color-danger)]">
                {error}
              </p>
            ) : null}

            <Button type="submit" sheet loading={submitting}>
              Sign in
            </Button>
          </form>
        </ConnectionGate>
      </div>
      <InstallPromptBar anchor="screen" />
    </div>
  )
}
