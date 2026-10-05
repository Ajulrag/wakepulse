import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { RequireAuth } from './components/auth/RequireAuth'
import './components/auth/AuthRoutes.css'
import { useAuth } from './context/useAuth'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

function AuthStatusPage({ message }: { message: string }) {
  const { refreshUser } = useAuth()

  return (
    <main className="auth-state-page" role="alert">
      <section className="auth-state-card">
        <h1>Unable to verify your session</h1>
        <p>{message}</p>
        <button type="button" onClick={() => void refreshUser()}>
          Try again
        </button>
      </section>
    </main>
  )
}

function PublicOnly() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'checking') {
    return (
      <main className="auth-state-page" role="status" aria-live="polite">
        <p>Checking your session…</p>
      </main>
    )
  }

  if (state.status === 'error') {
    return <AuthStatusPage message={state.message} />
  }

  if (state.status === 'authenticated') {
    const redirectPath = (location.state as { from?: unknown } | null)?.from
    const destination =
      location.pathname !== '/register' &&
      typeof redirectPath === 'string' &&
      redirectPath.startsWith('/') &&
      !redirectPath.startsWith('//')
        ? redirectPath
        : '/dashboard'

    return <Navigate to={destination} replace />
  }

  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
