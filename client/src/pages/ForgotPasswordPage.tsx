import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiRequestError } from '../api/request'
import { requestPasswordReset } from '../api/auth'
import { AuthShowcase } from '../components/auth/AuthShowcase'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await requestPasswordReset(normalizedEmail)
      setSent(true)
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : 'Unable to request a password reset right now. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-label="Reset your WakePulse password">
        <div className="auth-form-panel">
          <div className="auth-heading">
            <p className="auth-eyebrow"><span />Account recovery</p>
            <h1 id="forgot-password-title">Forgot your password?</h1>
            <p>Enter the email address associated with your account and we’ll send you a reset link.</p>
          </div>

          {sent ? (
            <div className="auth-result" role="status" aria-live="polite">
              <span className="auth-result-icon" aria-hidden="true">✓</span>
              <p>
                If an account exists for <strong>{email.trim()}</strong>, a
                password reset link has been sent. Check your inbox.
              </p>
            </div>
          ) : (
            <form
              className="auth-login-form"
              noValidate
              onSubmit={(event) => void handleSubmit(event)}
              aria-busy={isSubmitting}
            >
              {error && <div className="auth-login-error" role="alert">{error}</div>}
              <div className="auth-login-field">
                <label htmlFor="forgot-email">Email address</label>
                <div className="auth-input-wrap">
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <rect x="2.5" y="4" width="15" height="12" rx="2" />
                    <path d="m3.5 5.5 6.5 5 6.5-5" />
                  </svg>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setError(null)
                    }}
                    aria-invalid={Boolean(error)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <button className="auth-login-submit" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Sending link…' : 'Send reset link'}</span>
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M3 10h13m-5-5 5 5-5 5" />
                </svg>
              </button>
            </form>
          )}

          <p className="auth-login-register">
            Remembered your password? <Link to="/login">Back to sign in</Link>
          </p>
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
