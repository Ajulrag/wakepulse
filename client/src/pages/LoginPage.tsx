import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiRequestError } from '../api/request'
import { useAuth } from '../context/useAuth'

interface LoginRouteState {
  from?: unknown
}

interface LoginFieldErrors {
  email?: string
  password?: string
}

function getLoginDestination(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return '/dashboard'
  }

  const from = (state as LoginRouteState).from

  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
    ? from
    : '/dashboard'
}

function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return 'Unable to sign in right now. Please try again.'
  }

  if (error.status === 401) {
    return 'The email or password is incorrect.'
  }

  if (error.status === 403) {
    return 'This account is disabled. Contact your administrator for help.'
  }

  if (error.status === 429) {
    return 'Too many sign-in attempts. Please wait a little and try again.'
  }

  if (error.status === 400) {
    return 'Please check your email and password and try again.'
  }

  if (error.status === null && error.message.includes('connect')) {
    return 'Unable to connect to WakePulse. Check your connection and try again.'
  }

  return 'Sign-in is temporarily unavailable. Please try again shortly.'
}

function getServerFieldErrors(error: unknown): LoginFieldErrors {
  if (!(error instanceof ApiRequestError) || error.status !== 400) {
    return {}
  }

  return {
    email: error.fieldErrors?.email?.[0],
    password: error.fieldErrors?.password?.[0],
  }
}

function validateCredentials(email: string, password: string): LoginFieldErrors {
  const errors: LoginFieldErrors = {}
  const normalizedEmail = email.trim()

  if (!normalizedEmail) {
    errors.email = 'Enter your email address.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Enter your password.'
  }

  return errors
}

export function LoginPage() {
  const { login, state: authState } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const logoutWarning =
    authState.status === 'unauthenticated' && authState.logoutWarning === true
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submissionLock = useRef(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submissionLock.current) {
      return
    }

    const validationErrors = validateCredentials(email, password)
    setFieldErrors(validationErrors)
    setFormError(null)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    submissionLock.current = true
    setIsSubmitting(true)

    try {
      await login({ email: email.trim(), password })
      navigate(getLoginDestination(location.state), { replace: true })
    } catch (error: unknown) {
      setFieldErrors(getServerFieldErrors(error))
      setFormError(getLoginErrorMessage(error))
    } finally {
      submissionLock.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-placeholder-page">
      <section className="auth-login-card" aria-labelledby="login-title">
        <Link className="auth-login-brand" to="/login" aria-label="WakePulse sign in">
          <span className="auth-login-brand-mark" aria-hidden="true">W</span>
          <span>wakepulse</span>
        </Link>

        <div className="auth-login-heading">
          <p className="auth-login-eyebrow">SERVICE MONITORING</p>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to view your services and monitoring activity.</p>
        </div>

        {logoutWarning && (
          <div className="auth-logout-warning" role="status">
            You are signed out in this app, but WakePulse could not confirm that the
            server session ended. Check your connection before continuing.
          </div>
        )}

        <form
          className="auth-login-form"
          noValidate
          onSubmit={(event) => void handleSubmit(event)}
          aria-busy={isSubmitting}
        >
          {formError && (
            <div className="auth-login-error" role="alert">
              {formError}
            </div>
          )}

          <div className="auth-login-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setFieldErrors((errors) => ({ ...errors, email: undefined }))
                setFormError(null)
              }}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              disabled={isSubmitting}
            />
            {fieldErrors.email && (
              <p className="auth-login-field-error" id="login-email-error">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="auth-login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setFieldErrors((errors) => ({ ...errors, password: undefined }))
                setFormError(null)
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
              disabled={isSubmitting}
            />
            {fieldErrors.password && (
              <p className="auth-login-field-error" id="login-password-error">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button className="auth-login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-login-register">
          New to WakePulse? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  )
}
