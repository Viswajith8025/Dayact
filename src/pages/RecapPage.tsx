import { useSearchParams } from 'react-router-dom'
import { WeeklyRecapCard } from '../components/WeeklyRecapCard'

export function RecapPage() {
  const [params] = useSearchParams()
  const force = params.get('recap') === '1'
  return (
    <section className="space-y-[var(--space-section)]">
      <h1 className="typo-large-title text-[var(--color-text)]">Recap</h1>
      <WeeklyRecapCard forceShow={force || true} />
    </section>
  )
}
