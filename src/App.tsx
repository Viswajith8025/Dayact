import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { useAuth } from './lib/auth'
import { AchievementsPage } from './pages/AchievementsPage'
import { FollowupsPage } from './pages/FollowupsPage'
import { LoginPage } from './pages/LoginPage'

const TodayPage = lazy(() => import('./pages/TodayPage').then((m) => ({ default: m.TodayPage })))

const ChallengesPage = lazy(() =>
  import('./pages/ChallengesPage').then((m) => ({ default: m.ChallengesPage })),
)
const HeatmapPage = lazy(() => import('./pages/HeatmapPage').then((m) => ({ default: m.HeatmapPage })))
const RecapPage = lazy(() => import('./pages/RecapPage').then((m) => ({ default: m.RecapPage })))

function SessionBootstrap() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)]"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div
        className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-accent)] opacity-40"
        aria-hidden
      />
    </div>
  )
}

function RequireAuth() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

function LazyFallback() {
  return <SessionBootstrap />
}

function AppRoutes() {
  const { loading } = useAuth()
  if (loading) return <SessionBootstrap />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={
            <Suspense fallback={<LazyFallback />}>
              <TodayPage />
            </Suspense>
          } />
          <Route path="/followups" element={<FollowupsPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route
            path="/challenges"
            element={
              <Suspense fallback={<LazyFallback />}>
                <ChallengesPage />
              </Suspense>
            }
          />
          <Route
            path="/heatmap"
            element={
              <Suspense fallback={<LazyFallback />}>
                <HeatmapPage />
              </Suspense>
            }
          />
          <Route
            path="/recap"
            element={
              <Suspense fallback={<LazyFallback />}>
                <RecapPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return <AppRoutes />
}
