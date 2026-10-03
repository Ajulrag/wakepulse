import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

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
      <main className="auth-state" role="alert">
        <h1>Unable to verify your session</h1>
        <p>{state.message}</p>
        <button type="button" onClick={() => void refreshUser()}>
          Try again
        </button>
      </main>
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
