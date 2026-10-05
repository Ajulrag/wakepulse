import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getServiceDetails } from '../api/service-details'
import { ApiRequestError } from '../api/request'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../context/useAuth'
import type { MonitoredService, ServiceStatus } from '../types/service'

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
                  : service.lastError === null
                    ? 'No error details were reported by the latest check.'
                    : 'The latest check reported an issue. Detailed error information is not shown here.'}
              </p>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
