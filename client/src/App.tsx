import { useEffect, useState } from 'react'
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { BACKEND_ERROR_EVENT } from './api/request'
import { RequireAuth } from './components/auth/RequireAuth'
import './components/auth/AuthRoutes.css'
import { useAuth } from './context/useAuth'
import { ServicesPage } from './pages/ServicesPage'
import { ServiceDetailsPage } from './pages/ServiceDetailsPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { ThemeToggle } from './components/ThemeToggle'
import { ErrorPage } from './components/ErrorPage'

function AuthStatusPage({ message }: { message: string }) {
  const { refreshUser } = useAuth()

  return (
    <ErrorPage
      variant="session"
      message={message}
      onRetry={() => void refreshUser()}
    />
  )
}

function PublicOnly() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'checking') {
    return (
      <main className="auth-state-page" role="status" aria-live="polite">
        <ThemeToggle />
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
  const [errorVariant, setErrorVariant] = useState<
    'backend' | 'application' | null
  >(null)

  useEffect(() => {
    const handleBackendError = () => setErrorVariant('backend')
    const handleUnexpectedError = () => setErrorVariant('application')

    window.addEventListener(BACKEND_ERROR_EVENT, handleBackendError)
    window.addEventListener('error', handleUnexpectedError)
    window.addEventListener('unhandledrejection', handleUnexpectedError)

    return () => {
      window.removeEventListener(BACKEND_ERROR_EVENT, handleBackendError)
      window.removeEventListener('error', handleUnexpectedError)
      window.removeEventListener('unhandledrejection', handleUnexpectedError)
    }
  }, [])

  if (errorVariant) {
    return (
      <ErrorPage
        variant={errorVariant}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/:serviceId" element={<ServiceDetailsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<ErrorPage variant="not-found" />} />
    </Routes>
  )
}
