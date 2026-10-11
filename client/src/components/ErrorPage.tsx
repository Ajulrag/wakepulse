import { ThemeToggle } from './ThemeToggle'
import './ErrorPage.css'

type ErrorPageVariant = 'not-found' | 'backend' | 'application' | 'session'

interface ErrorPageProps {
  variant: ErrorPageVariant
  message?: string
  onRetry?: () => void
  showThemeToggle?: boolean
}

const errorContent: Record<
  ErrorPageVariant,
  { code: string; title: string; description: string }
> = {
  'not-found': {
    code: '404',
    title: 'This page is off the map',
    description:
      'We couldn’t find the page you were looking for. It may have moved, or the address may be incorrect.',
  },
  backend: {
    code: 'SERVICE ISSUE',
    title: 'We’re having trouble connecting',
    description:
      'WakePulse is temporarily unable to reach its services. Your data is safe. Please try again in a moment.',
  },
  application: {
    code: 'APP ERROR',
    title: 'Something didn’t go as planned',
    description:
      'An unexpected issue interrupted this page. You can try again or return to your dashboard.',
  },
  session: {
    code: 'SESSION CHECK',
    title: 'We couldn’t verify your session',
    description:
      'Please try again. If the problem continues, sign in again to continue to your workspace.',
  },
}

export function ErrorPage({
  variant,
  message,
  onRetry,
  showThemeToggle = true,
}: ErrorPageProps) {
  const content = errorContent[variant]

  return (
    <main className="error-page">
      <div className="error-page-toolbar">
        <a className="error-page-brand" href="/" aria-label="WakePulse home">
          <span className="error-page-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path
                d="M4 17h6l3.2-8 5.1 15 3.1-7H28"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
            </svg>
          </span>
          <span>wakepulse</span>
        </a>
        {showThemeToggle && <ThemeToggle />}
      </div>

      <section className="error-card" role="alert" aria-live="assertive">
        <div className="error-illustration" aria-hidden="true">
          <div className="error-illustration-ring error-illustration-ring--outer" />
          <div className="error-illustration-ring error-illustration-ring--inner" />
          <div className="error-illustration-icon">
            <svg viewBox="0 0 48 48" fill="none">
              <path
                d="M7 25h9l4-10 7 19 5-12h9"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
              <circle cx="24" cy="24" r="21" stroke="currentColor" />
            </svg>
          </div>
          <span className="error-spark error-spark--one" />
          <span className="error-spark error-spark--two" />
          <span className="error-spark error-spark--three" />
        </div>

        <p className="error-code">{content.code}</p>
        <h1>{content.title}</h1>
        <p className="error-description">{message ?? content.description}</p>

        <div className="error-actions">
          {onRetry && (
            <button className="error-retry-button" type="button" onClick={onRetry}>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M16.3 8A6.5 6.5 0 0 0 4.6 6L3 8m0 0V4.5M3 8h3.5M3.7 12A6.5 6.5 0 0 0 15.4 14l1.6-2m0 0v3.5m0-3.5h-3.5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                />
              </svg>
              Try again
            </button>
          )}
          <a className="error-home-link" href="/">
            Return to dashboard
            <span aria-hidden="true">→</span>
          </a>
        </div>

        <p className="error-footer-note">
          We’re sorry for the interruption. WakePulse is here to help keep your
          services running.
        </p>
      </section>
    </main>
  )
}
