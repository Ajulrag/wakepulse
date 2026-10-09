import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiRequestError } from '../api/request'
import { resetPassword } from '../api/auth'
import { AuthShowcase } from '../components/auth/AuthShowcase'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (password.length < 8 || password.length > 128) {
      setError('Password must be between 8 and 128 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await resetPassword({ token, password })
      setIsComplete(true)
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : 'Unable to reset your password right now. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const invalidLink = !/^[A-Za-z0-9_-]{43}$/.test(token)

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-label="Choose a new WakePulse password">
        <div className="auth-form-panel">
          <div className="auth-heading">
            <p className="auth-eyebrow"><span />Account recovery</p>
            <h1 id="reset-password-title">
              {isComplete ? 'Password updated' : 'Choose a new password'}
            </h1>
            <p>
              {isComplete
                ? 'Your password has been changed. You can now sign in securely.'
                : 'Create a new password for your WakePulse account.'}
            </p>
          </div>

          {isComplete ? (
            <div className="auth-result" role="status" aria-live="polite">
              <span className="auth-result-icon" aria-hidden="true">✓</span>
              <p>Your password was reset successfully. Sign in using your new password.</p>
              <Link className="auth-login-submit auth-result-link" to="/login">Back to sign in</Link>
            </div>
          ) : invalidLink ? (
            <div className="auth-result" role="alert">
              <p>This password reset link is invalid or has expired. Request a new link to continue.</p>
              <Link className="auth-login-submit auth-result-link" to="/forgot-password">Request a new link</Link>
            </div>
          ) : (
            <form
              className="auth-login-form auth-register-form"
              noValidate
              onSubmit={(event) => void handleSubmit(event)}
              aria-busy={isSubmitting}
            >
              {error && <div className="auth-login-error" role="alert">{error}</div>}
              <div className="auth-login-field">
                <label htmlFor="reset-password">New password</label>
                <input
                  id="reset-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError(null)
                  }}
                  aria-invalid={Boolean(error)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="auth-login-field">
                <label htmlFor="reset-confirm-password">Confirm new password</label>
                <input
                  id="reset-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setError(null)
                  }}
                  aria-invalid={Boolean(error)}
                  disabled={isSubmitting}
                />
              </div>
              <button className="auth-login-submit" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Updating password…' : 'Update password'}</span>
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M3 10h13m-5-5 5 5-5 5" />
                </svg>
              </button>
            </form>
          )}

          {!isComplete && (
            <p className="auth-login-register">
              <Link to="/login">Back to sign in</Link>
            </p>
          )}
          <div className="auth-trust-row">
            <span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m8 1 5 2v4c0 3.2-2.2 5.8-5 7-2.8-1.2-5-3.8-5-7V3l5-2Zm-2 6 1.4 1.5L10.5 5" /></svg>SOC 2 Type II Certified</span>
            <i />
            <span><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="m5.3 8 1.8 1.8 3.7-4" /></svg>99.99% Uptime SLA</span>
          </div>
        </div>
        <AuthShowcase />
      </section>
    </main>
  )
}
