import type { ReactNode } from 'react'
import { useOnline } from '../lib/network'

export function ConnectionGate({ children }: { children: ReactNode }) {
  const online = useOnline()

  if (!online) {
    return (
      <p role="status" className="typo-subhead text-[var(--color-text-muted)]">
        You're offline. Dayact will load when you're back.
      </p>
    )
  }

  return children
}
