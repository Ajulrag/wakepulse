import {
  Link,
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

interface AuthPlaceholderProps {
  mode: 'login' | 'register'
}

function AuthPlaceholder({ mode }: AuthPlaceholderProps) {
  const isLogin = mode === 'login'

  return (
    <main className="auth-placeholder-page">
      <section className="auth-placeholder-card" aria-labelledby="auth-placeholder-title">
        <p className="auth-placeholder-brand">WakePulse</p>
        <h1 id="auth-placeholder-title">
          {isLogin ? 'Sign in' : 'Create your account'}
        </h1>
        <p>
          {isLogin
            ? 'The sign-in form will be added in a later development step.'
            : 'The registration form will be added in a later development step.'}
        </p>
        <Link className="auth-placeholder-link" to={isLogin ? '/register' : '/login'}>
          {isLogin ? 'Go to registration' : 'Go to sign in'}
        </Link>
        <p className="auth-placeholder-switch">
          {isLogin ? 'Need an account? ' : 'Already have an account? '}
          <Link to={isLogin ? '/register' : '/login'}>
            {isLogin ? 'Register' : 'Sign in'}
          </Link>
        </p>
      </section>
    </main>
  )
}

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
        <Route path="/login" element={<AuthPlaceholder mode="login" />} />
        <Route path="/register" element={<AuthPlaceholder mode="register" />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
