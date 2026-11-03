import type { ReactNode } from 'react'
import { useOnline } from '../lib/network'

export function ConnectionGate({ children }: { children: ReactNode }) {
  const online = useOnline()

  if (!online) {
    return (
      <p
        role="status"
        className="text-[var(--text-sm)] leading-[var(--leading-relaxed)] text-[var(--color-text-muted)]"
      >
        No connection. Dayact needs a network connection to load data.
      </p>
    )
  }

  return children
}
