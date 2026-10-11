import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { ErrorPage } from '../ErrorPage'

export function RequireAuth() {
  const { state, refreshUser } = useAuth()
  const location = useLocation()

  if (state.status === 'checking') {
    return (
      <main className="auth-state" role="status" aria-live="polite">
        <p>Checking your session…</p>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <ErrorPage
        variant="session"
        message={state.message}
        onRetry={() => void refreshUser()}
      />
    )
  }

  if (state.status === 'unauthenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    )
  }

  return <Outlet />
}
