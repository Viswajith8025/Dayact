import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ConnectionGate } from '../components/ConnectionGate'
import { Input } from '../components/Input'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return null
  }

  if (session) {
    return <Navigate to="/today" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setSubmitting(false)

    if (signInError) {
      setError(signInError.message)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)] px-[var(--space-page)] py-[var(--space-section)]">
      <div className="w-full max-w-md space-y-[var(--space-section)]">
        <header className="space-y-[var(--space-3)]">
          <h1 className="text-[var(--text-xl)] font-medium leading-[var(--leading-tight)] text-[var(--color-text)]">
            Dayact
          </h1>
          <p className="text-[var(--text-sm)] leading-[var(--leading-relaxed)] text-[var(--color-text-muted)]">
            Sign in with the account your team owner created for you.
          </p>
        </header>

        <ConnectionGate>
          <form
            className="space-y-[var(--space-5)] rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-6)]"
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
              <p
                role="alert"
                className="rounded-[var(--radius-sm)] bg-[var(--color-danger-surface)] px-[var(--space-4)] py-[var(--space-3)] text-[var(--text-sm)] leading-[var(--leading-normal)] text-[var(--color-danger)]"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </ConnectionGate>
      </div>
    </div>
  )
}
