import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiRequestError } from '../api/request'
import { useAuth } from '../context/useAuth'

interface RegisterFieldErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

function validateRegistration(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {}
  const normalizedName = name.trim()
  const normalizedEmail = email.trim()

  if (!normalizedName) {
    errors.name = 'Enter your name.'
  } else if (normalizedName.length < 2 || normalizedName.length > 100) {
    errors.name = 'Name must be between 2 and 100 characters.'
  }

  if (!normalizedEmail) {
    errors.email = 'Enter your email address.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Enter a password.'
  } else if (password.length < 8 || password.length > 128) {
    errors.password = 'Password must be between 8 and 128 characters.'
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm your password.'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

function getServerFieldErrors(error: unknown): RegisterFieldErrors {
  if (!(error instanceof ApiRequestError) || error.status !== 400) {
    return {}
  }

  return {
    name: error.fieldErrors?.name?.[0],
    email: error.fieldErrors?.email?.[0],
    password: error.fieldErrors?.password?.[0],
  }
}

function getRegistrationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return 'Unable to create your account right now. Please try again.'
  }

  if (error.status === 400) {
    return 'Please review your details and try again.'
  }

  if (error.status === 409) {
    return 'An account with this email already exists. Sign in or use a different email.'
  }

  if (error.status === 429) {
    return 'Too many registration attempts. Please wait a little and try again.'
  }

  if (error.status === null && error.message.includes('connect')) {
    return 'Unable to connect to WakePulse. Check your connection and try again.'
  }

  return 'Unable to create your account right now. Please try again shortly.'
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submissionLock = useRef(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submissionLock.current) {
      return
    }

    const validationErrors = validateRegistration(
      name,
      email,
      password,
      confirmPassword,
    )
    setFieldErrors(validationErrors)
    setFormError(null)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    submissionLock.current = true
    setIsSubmitting(true)

    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      })
      navigate('/dashboard', { replace: true })
    } catch (error: unknown) {
      setFieldErrors(getServerFieldErrors(error))
      setFormError(getRegistrationErrorMessage(error))
    } finally {
      submissionLock.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-placeholder-page">
      <section className="auth-login-card auth-register-card" aria-labelledby="register-title">
        <Link className="auth-login-brand" to="/login" aria-label="WakePulse sign in">
          <span className="auth-login-brand-mark" aria-hidden="true">W</span>
          <span>wakepulse</span>
        </Link>

        <div className="auth-login-heading auth-register-heading">
          <p className="auth-login-eyebrow">SERVICE MONITORING</p>
          <h1 id="register-title">Create your account</h1>
          <p>Start monitoring your services with WakePulse.</p>
        </div>

        <form
          className="auth-login-form auth-register-form"
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
            <label htmlFor="register-name">Name</label>
            <input
              id="register-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setFieldErrors((errors) => ({ ...errors, name: undefined }))
                setFormError(null)
              }}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
              disabled={isSubmitting}
            />
            {fieldErrors.name && (
              <p className="auth-login-field-error" id="register-name-error">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="auth-login-field">
            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
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
              aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
              disabled={isSubmitting}
            />
            {fieldErrors.email && (
              <p className="auth-login-field-error" id="register-email-error">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="auth-login-field">
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setFieldErrors((errors) => ({
                  ...errors,
                  password: undefined,
                  confirmPassword: undefined,
                }))
                setFormError(null)
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
              disabled={isSubmitting}
            />
            {fieldErrors.password && (
              <p className="auth-login-field-error" id="register-password-error">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="auth-login-field">
            <label htmlFor="register-confirm-password">Confirm password</label>
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value)
                setFieldErrors((errors) => ({ ...errors, confirmPassword: undefined }))
                setFormError(null)
              }}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              aria-describedby={
                fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined
              }
              disabled={isSubmitting}
            />
            {fieldErrors.confirmPassword && (
              <p className="auth-login-field-error" id="register-confirm-password-error">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <button className="auth-login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-login-register">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
