import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { useAuth } from './lib/auth'
import { AchievementsPage } from './pages/AchievementsPage'
import { FollowupsPage } from './pages/FollowupsPage'
import { LoginPage } from './pages/LoginPage'
import { TodayPage } from './pages/TodayPage'

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

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function AppRoutes() {
  const { loading } = useAuth()

  if (loading) {
    return <SessionBootstrap />
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/followups" element={<FollowupsPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
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
