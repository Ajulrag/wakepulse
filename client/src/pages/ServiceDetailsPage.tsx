import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getServiceDetails, getServiceSummary } from '../api/service-details'
import { ApiRequestError } from '../api/request'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../context/useAuth'
import type { MonitoredService, ServiceStatus, ServiceSummaryResponse } from '../types/service'

type ServiceDetailsState =
  | { status: 'loading' }
  | { status: 'success'; serviceId: string; service: MonitoredService }
  | { status: 'not-found'; serviceId: string }
  | { status: 'session-error'; serviceId: string }
  | { status: 'error'; serviceId: string; message: string }

const serviceStatusLabels: Record<ServiceStatus, string> = {
  unknown: 'Unknown',
  online: 'Online',
  offline: 'Offline',
  disabled: 'Disabled',
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function getProviderLabel(provider: MonitoredService['provider']): string {
  if (provider === 'fly') {
    return 'Fly.io'
  }

  return `${provider[0].toUpperCase()}${provider.slice(1)}`
}

function getServiceHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return 'Configured service address'
  }
}

function formatDateTime(value: string | null, emptyLabel: string): string {
  if (value === null) {
    return emptyLabel
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

function formatInterval(intervalSeconds: number): string {
  if (intervalSeconds % 86400 === 0) {
    const days = intervalSeconds / 86400
    return `${days} ${days === 1 ? 'day' : 'days'}`
  }

  if (intervalSeconds % 3600 === 0) {
    const hours = intervalSeconds / 3600
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }

  if (intervalSeconds % 60 === 0) {
    const minutes = intervalSeconds / 60
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  }

  return `${intervalSeconds} ${intervalSeconds === 1 ? 'second' : 'seconds'}`
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === null) {
      if (error.message === 'The WakePulse API returned an unexpected service response.') {
        return 'WakePulse returned service details in an unexpected format. Please try again.'
      }

      return 'WakePulse could not be reached. Check your connection and try again.'
    }

    if (error.status >= 500) {
      return 'Service details are temporarily unavailable. Please try again shortly.'
    }

    return error.message
  }

  return 'Unable to load this service. Please try again.'
}

function ServiceDetailsBackLink() {
  return (
    <Link className="service-details-back-link" to="/services">
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="m12.5 4.5-5.5 5.5 5.5 5.5" />
      </svg>
      Back to Services
    </Link>
  )
}

export function ServiceDetailsPage() {
  const { serviceId } = useParams<{ serviceId: string }>()
  const { refreshUser } = useAuth()
  const refreshUserRef = useRef(refreshUser)
  const sessionRefreshAttempted = useRef(false)
  const [requestState, setRequestState] = useState<ServiceDetailsState>({
    status: 'loading',
  })
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    refreshUserRef.current = refreshUser
  }, [refreshUser])

  useEffect(() => {
    if (!serviceId) {
      return
    }

    const controller = new AbortController()

    getServiceDetails(serviceId, controller.signal)
      .then((service) => {
        sessionRefreshAttempted.current = false
        setRequestState({ status: 'success', serviceId, service })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        const status = error instanceof ApiRequestError ? error.status : null

        if (status === 404) {
          setRequestState({ status: 'not-found', serviceId })
          return
        }

        if (status === 401 || status === 403) {
          setRequestState({ status: 'session-error', serviceId })

          if (!sessionRefreshAttempted.current) {
            sessionRefreshAttempted.current = true
            void refreshUserRef.current()
          }

          return
        }

        setRequestState({
          status: 'error',
          serviceId,
          message: getSafeErrorMessage(error),
        })
      })

    return () => controller.abort()
  }, [retryCount, serviceId])

  const currentState: ServiceDetailsState =
    serviceId === undefined
      ? {
          status: 'error',
          serviceId: '',
          message: 'The service address is incomplete. Return to Services and select a service.',
        }
      : requestState.status === 'loading' || requestState.serviceId === serviceId
        ? requestState
        : { status: 'loading' }

  const service = currentState.status === 'success' ? currentState.service : null

  const retry = () => {
    setRequestState({ status: 'loading' })
    setRetryCount((count) => count + 1)
  }

  const retrySession = async () => {
    await refreshUserRef.current()
    retry()
  }

  // 2M.3 — Monitoring statistics
  type StatsWindow = '24h' | '7d' | '30d'
  const [statsWindow, setStatsWindow] = useState<StatsWindow>('7d')
  const [statsState, setStatsState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: ServiceSummaryResponse['summary'] }
    | { status: 'error'; message: string }
  >({ status: 'idle' })

  useEffect(() => {
    if (!serviceId || currentState.status !== 'success') {
      return
    }
    const controller = new AbortController()
    setStatsState({ status: 'loading' })
    getServiceSummary(serviceId, statsWindow, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setStatsState({ status: 'success', data })
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const msg = error instanceof ApiRequestError ? error.message : 'Unable to load statistics.'
        setStatsState({ status: 'error', message: msg })
      })
    return () => controller.abort()
  }, [serviceId, statsWindow, currentState.status])

  const statsData = statsState.status === 'success' ? statsState.data : null
  const metrics = statsData?.metrics

  return (
    <AppLayout activePage="services">
      <div
        className="page-content"
        aria-busy={currentState.status === 'loading'}
      >
        <ServiceDetailsBackLink />

        <section className="page-heading" aria-labelledby="service-details-title">
          <div>
            <p className="eyebrow">SERVICE MONITORING</p>
            <h1 className="service-details-page-title" id="service-details-title">
              {service?.name ?? 'Service details'}
            </h1>
            <p className="page-description">
              Current configuration and latest monitoring state for this service.
            </p>
          </div>
        </section>

        <section
          className="service-details-section"
          aria-labelledby="service-details-overview-title"
        >
          <div className="summary-section-heading">
            <div>
              <h2 id="service-details-overview-title">Monitoring overview</h2>
              <p>Health and schedule information reported by WakePulse.</p>
            </div>
          </div>

          {currentState.status === 'loading' && (
            <div
              className="dashboard-panel service-details-loading"
              role="status"
              aria-live="polite"
            >
              <span className="visually-hidden">Loading service details…</span>
              <span className="skeleton-bar skeleton-bar--label" aria-hidden="true" />
              <span className="skeleton-bar skeleton-bar--value" aria-hidden="true" />
              <span className="skeleton-bar skeleton-bar--description" aria-hidden="true" />
              <span className="skeleton-bar skeleton-bar--description" aria-hidden="true" />
            </div>
          )}

          {currentState.status === 'not-found' && (
            <div className="dashboard-panel service-details-message" role="alert">
              <h3>Service not found</h3>
              <p>
                This service is unavailable or may no longer belong to your account.
              </p>
              <ServiceDetailsBackLink />
            </div>
          )}

          {currentState.status === 'session-error' && (
            <div className="dashboard-error" role="alert">
              <div className="dashboard-error-copy">
                <span className="dashboard-error-mark" aria-hidden="true">
                  !
                </span>
                <div>
                  <h3>Session verification required</h3>
                  <p>WakePulse is checking your session before loading this service.</p>
                </div>
              </div>
              <button
                className="dashboard-retry-button"
                type="button"
                onClick={() => void retrySession()}
              >
                Verify session
              </button>
            </div>
          )}

          {currentState.status === 'error' && (
            <div className="dashboard-error" role="alert">
              <div className="dashboard-error-copy">
                <span className="dashboard-error-mark" aria-hidden="true">
                  !
                </span>
                <div>
                  <h3>Service details unavailable</h3>
                  <p>{currentState.message}</p>
                </div>
              </div>
              <button
                className="dashboard-retry-button"
                type="button"
                onClick={retry}
              >
                Try again
              </button>
            </div>
          )}

          {service && (
            <div className="service-overview-grid" aria-label="Service status overview">
              <article className={`service-overview-card service-overview-card--${service.status}`} aria-label={`Health: ${serviceStatusLabels[service.status]}`}>
                <div className="service-overview-card-heading">
                  <h3>Health</h3>
                  <span className={`service-overview-indicator service-overview-indicator--${service.status}`} aria-hidden="true" />
                </div>
                <p className="service-overview-value">{serviceStatusLabels[service.status]}</p>
                <p className="service-overview-desc">
                  {service.status === 'online' && 'Service is responding successfully.'}
                  {service.status === 'offline' && 'Service did not respond to the latest check.'}
                  {service.status === 'unknown' && 'Health has not yet been established.'}
                  {service.status === 'disabled' && 'Monitoring is disabled; health is not tracked.'}
                </p>
              </article>

              <article className={`service-overview-card service-overview-card--${service.enabled ? 'enabled' : 'disabled'}`} aria-label={`Monitoring: ${service.enabled ? 'Enabled' : 'Disabled'}`}>
                <div className="service-overview-card-heading">
                  <h3>Monitoring</h3>
                  <span className={`service-overview-indicator service-overview-indicator--${service.enabled ? 'enabled' : 'disabled'}`} aria-hidden="true" />
                </div>
                <p className="service-overview-value">{service.enabled ? 'Enabled' : 'Disabled'}</p>
                <p className="service-overview-desc">
                  {service.enabled ? 'Checks are scheduled and running.' : 'No checks are scheduled.'}
                </p>
              </article>

              <article className="service-overview-card service-overview-card--checks" aria-label="Last check">
                <div className="service-overview-card-heading">
                  <h3>Last check</h3>
                  <span className="service-overview-indicator service-overview-indicator--checks" aria-hidden="true" />
                </div>
                <p className="service-overview-value">
                  {service.lastCheckedAt === null ? 'Never' : formatDateTime(service.lastCheckedAt, 'Never')}
                </p>
                <p className="service-overview-desc">
                  {service.lastCheckedAt === null ? 'No checks recorded yet.' : 'Most recent monitoring check.'}
                </p>
              </article>

              <article className="service-overview-card service-overview-card--checks" aria-label="Next check">
                <div className="service-overview-card-heading">
                  <h3>Next check</h3>
                  <span className="service-overview-indicator service-overview-indicator--checks" aria-hidden="true" />
                </div>
                <p className="service-overview-value">
                  {!service.enabled ? 'Disabled' : service.nextCheckAt === null ? 'Not scheduled' : formatDateTime(service.nextCheckAt, 'Not scheduled')}
                </p>
                <p className="service-overview-desc">
                  {!service.enabled ? 'Monitoring is disabled.' : service.nextCheckAt === null ? 'No upcoming check scheduled.' : 'Next scheduled monitoring check.'}
                </p>
              </article>
            </div>
          )}

          {service && (
            <div className="dashboard-panel service-details-panel">
              <div className="service-details-identity">
                <div className="service-details-endpoint">
                  <span className="service-details-provider">
                    {getProviderLabel(service.provider)}
                  </span>
                  <h3>{getServiceHost(service.url)}</h3>
                  <p>
                    <span>Endpoint</span>
                    <code>{service.endpoint}</code>
                  </p>
                </div>

                <div
                  className="service-details-statuses"
                  aria-label="Monitoring and health status"
                >
                  <span
                    className={`service-details-monitoring ${service.enabled ? 'service-details-monitoring--enabled' : 'service-details-monitoring--disabled'}`}
                  >
                    Monitoring {service.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span
                    className={`services-status services-status--${service.status}`}
                  >
                    <span className="services-status-mark" aria-hidden="true" />
                    {serviceStatusLabels[service.status]}
                  </span>
                </div>
              </div>

              <dl className="service-details-facts">
                <div>
                  <dt>Last checked</dt>
                  <dd>
                    {service.lastCheckedAt === null ? (
                      'Never checked'
                    ) : (
                      <time dateTime={service.lastCheckedAt}>
                        {formatDateTime(service.lastCheckedAt, 'Never checked')}
                      </time>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Last successful check</dt>
                  <dd>
                    {service.lastSuccessAt === null ? (
                      'No successful check yet'
                    ) : (
                      <time dateTime={service.lastSuccessAt}>
                        {formatDateTime(service.lastSuccessAt, 'No successful check yet')}
                      </time>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Next scheduled check</dt>
                  <dd>
                    {!service.enabled ? (
                      'Monitoring is disabled'
                    ) : service.nextCheckAt === null ? (
                      'Not scheduled'
                    ) : (
                      <time dateTime={service.nextCheckAt}>
                        {formatDateTime(service.nextCheckAt, 'Not scheduled')}
                      </time>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Check interval</dt>
                  <dd>{formatInterval(service.intervalSeconds)}</dd>
                </div>
                <div>
                  <dt>Last HTTP status</dt>
                  <dd>
                    {service.lastStatusCode === null
                      ? 'Not available yet'
                      : `HTTP ${service.lastStatusCode}`}
                  </dd>
                </div>
                <div>
                  <dt>Last response time</dt>
                  <dd>
                    {service.lastResponseTime === null
                      ? 'Not available yet'
                      : `${service.lastResponseTime} ms`}
                  </dd>
                </div>
              </dl>

              <p className="service-details-note" role="status">
                {service.lastCheckedAt === null
                  ? 'No monitoring checks have been recorded for this service.'
                  : service.lastError !== null
                    ? `Latest check reported an error: ${service.lastError}`
                    : 'No error details were reported by the latest check.'}
              </p>
            </div>
          )}
        </section>

        {/* 2M.3 — Monitoring statistics */}
        <section
          className="service-details-section"
          aria-labelledby="service-statistics-title"
        >
          <div className="summary-section-heading">
            <div>
              <h2 id="service-statistics-title">Monitoring statistics</h2>
              <p>Performance over the selected monitoring window.</p>
            </div>
            <div className="service-stats-window-selector" aria-label="Select monitoring window">
              <label htmlFor="stats-window" className="visually-hidden">Monitoring window</label>
              <select
                id="stats-window"
                value={statsWindow}
                onChange={(e) => setStatsWindow(e.target.value as StatsWindow)}
                aria-label="Monitoring window"
              >
                <option value="24h">24 hours</option>
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
              </select>
            </div>
          </div>

          {statsState.status === 'loading' && (
            <div className="dashboard-panel" role="status" aria-live="polite">
              <div className="service-stats-loading">
                <span className="visually-hidden">Loading statistics…</span>
                <span className="skeleton-bar skeleton-bar--label" aria-hidden="true" />
                <span className="skeleton-bar skeleton-bar--value" aria-hidden="true" />
                <span className="skeleton-bar skeleton-bar--description" aria-hidden="true" />
              </div>
            </div>
          )}

          {statsState.status === 'error' && (
            <div className="dashboard-error" role="alert">
              <div className="dashboard-error-copy">
                <span className="dashboard-error-mark" aria-hidden="true">!</span>
                <div>
                  <h3>Statistics unavailable</h3>
                  <p>{statsState.message}</p>
                </div>
              </div>
              <button
                className="dashboard-retry-button"
                type="button"
                onClick={() => setStatsWindow((w) => w)}
              >
                Try again
              </button>
            </div>
          )}

          {statsState.status === 'success' && metrics && (
            <div className="service-stats-grid" aria-label="Monitoring statistics">
              <article className="service-stats-card" aria-label="Total checks">
                <h3>Total checks</h3>
                <p className="service-stats-value">{metrics.totalChecks.toLocaleString()}</p>
                <p className="service-stats-desc">Checks in the selected window.</p>
              </article>
              <article className="service-stats-card service-stats-card--online" aria-label="Successful checks">
                <h3>Successful</h3>
                <p className="service-stats-value">{metrics.successfulChecks.toLocaleString()}</p>
                <p className="service-stats-desc">Checks that returned a success response.</p>
              </article>
              <article className="service-stats-card service-stats-card--offline" aria-label="Failed checks">
                <h3>Failed</h3>
                <p className="service-stats-value">{metrics.failedChecks.toLocaleString()}</p>
                <p className="service-stats-desc">Checks that did not return success.</p>
              </article>
              <article className="service-stats-card service-stats-card--accent" aria-label="Uptime percentage">
                <h3>Uptime</h3>
                <p className="service-stats-value">
                  {metrics.totalChecks > 0 ? `${metrics.uptimePercentage}%` : '—'}
                </p>
                <p className="service-stats-desc">
                  {metrics.totalChecks > 0 ? 'Percentage of successful checks.' : 'No checks recorded in this window.'}
                </p>
              </article>
              <article className="service-stats-card service-stats-card--response" aria-label="Average response time">
                <h3>Avg response</h3>
                <p className="service-stats-value">
                  {metrics.averageResponseTime !== null ? `${metrics.averageResponseTime} ms` : '—'}
                </p>
                <p className="service-stats-desc">
                  {metrics.averageResponseTime !== null ? 'Average response time for successful checks.' : 'No response time data available.'}
                </p>
              </article>
            </div>
          )}

          {statsState.status === 'idle' && (
            <div className="service-stats-empty" role="status">
              <p>Select a time window above to view monitoring statistics.</p>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
