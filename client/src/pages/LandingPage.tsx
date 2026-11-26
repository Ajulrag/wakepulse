import { Link, Navigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../context/useAuth'
import './LandingPage.css'

const capabilities = [
  {
    number: '01',
    title: 'Scheduled HTTP checks',
    description:
      'Choose an endpoint, request method, interval, and timeout for each service.',
  },
  {
    number: '02',
    title: 'A clear health overview',
    description:
      'See the latest service state, response times, and upcoming checks together.',
  },
  {
    number: '03',
    title: 'Useful check history',
    description:
      'Review recent results and inspect service-level monitoring statistics.',
  },
]

export function LandingPage() {
  const { state } = useAuth()

  if (state.status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="WakePulse home">
          <BrandLogo className="landing-brand-logo" />
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#capabilities">Capabilities</a>
          <ThemeToggle />
          <Link className="landing-sign-in" to="/login">
            Sign in
          </Link>
          <Link className="landing-sign-up" to="/register">
            Create account
          </Link>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-kicker">
            <span aria-hidden="true" />
            Lightweight service monitoring
          </p>
          <h1 id="landing-title">
            Know when your
            <br />
            services need attention.
          </h1>
          <p className="landing-description">
            WakePulse checks the HTTP endpoints you configure, records each
            result, and gives you a clear view of service health and response
            times.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-primary-action" to="/register">
              Get started
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="landing-secondary-action" to="/login">
              Sign in to your workspace
            </Link>
          </div>
          <p className="landing-footnote">
            Configure checks that fit your services. No infrastructure setup
            required.
          </p>
        </div>

        <div className="landing-preview" aria-label="How WakePulse monitoring works">
          <div className="landing-preview-topbar">
            <span className="landing-preview-brand">
              <span className="landing-preview-mark" aria-hidden="true">W</span>
              WakePulse
            </span>
            <span className="landing-preview-period">Monitoring workflow</span>
          </div>
          <div className="landing-preview-content">
            <div className="landing-preview-heading">
              <div>
                <span>YOUR WORKSPACE</span>
                <h2>From endpoint to insight</h2>
              </div>
              <span className="landing-preview-indicator">HTTP monitoring</span>
            </div>
            <ol className="landing-workflow">
              <li>
                <span>01</span>
                <div>
                  <strong>Choose an endpoint</strong>
                  <small>Add a URL and health path for a service.</small>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Set the check schedule</strong>
                  <small>Pick an interval, method, and timeout.</small>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Review recorded results</strong>
                  <small>See status, response time, and history.</small>
                </div>
              </li>
            </ol>
            <div className="landing-preview-footer">
              <span>Service health</span>
              <span>Response times</span>
              <span>Check history</span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="landing-capabilities"
        id="capabilities"
        aria-labelledby="capabilities-title"
      >
        <div className="landing-section-heading">
          <p className="landing-kicker">MONITORING THAT STAYS CLEAR</p>
          <h2 id="capabilities-title">The essentials, in one workspace.</h2>
          <p>
            Configure lightweight checks and understand what they report without
            adding another layer of infrastructure.
          </p>
        </div>
        <div className="landing-capability-grid">
          {capabilities.map((capability) => (
            <article className="landing-capability-card" key={capability.number}>
              <span>{capability.number}</span>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <BrandLogo className="landing-footer-logo" />
        <span>Service health, made easier to follow.</span>
        <Link to="/register">Create your workspace</Link>
      </footer>
    </main>
  )
}
