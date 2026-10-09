import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../components/AppLayout'
import { DashboardApiError, getDashboardOverview } from '../api/dashboard'
import type { DashboardActivityItem } from '../types/dashboard'

const statusTone: Record<DashboardActivityItem['status'], string> = {
  success: 'history-pill history-pill--success',
  failed: 'history-pill history-pill--failed',
  timeout: 'history-pill history-pill--timeout',
  error: 'history-pill history-pill--error',
}

const statusLabel: Record<DashboardActivityItem['status'], string> = {
  success: 'Success',
  failed: 'Failed',
  timeout: 'Timeout',
  error: 'Error',
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function HistoryPage() {
  const [requestState, setRequestState] = useState<
    | { status: 'loading' }
    | { status: 'success'; items: DashboardActivityItem[] }
    | { status: 'error'; message: string }
  >({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    getDashboardOverview(controller.signal)
      .then((dashboard) => {
        setRequestState({ status: 'success', items: dashboard.activity })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        setRequestState({
          status: 'error',
          message:
            error instanceof DashboardApiError
              ? error.message
              : 'Unable to load monitoring history right now.',
        })
      })

    return () => controller.abort()
  }, [])

  const summary = useMemo(() => {
    if (requestState.status !== 'success') {
      return null
    }

    const total = requestState.items.length
    const successful = requestState.items.filter((item) => item.status === 'success').length
    const failed = requestState.items.filter((item) => item.status !== 'success').length

    return {
      total,
      successful,
      failed,
    }
  }, [requestState])

  return (
    <AppLayout activePage="history">
      <div className="page-content" aria-busy={requestState.status === 'loading'}>
        <section className="page-heading" aria-labelledby="history-title">
          <div>
            <p className="eyebrow">MONITORING HISTORY</p>
            <h1 id="history-title">Service check history</h1>
            <p className="page-description">
              Review recent checks and identify which services have had issues in the last run window.
            </p>
          </div>
        </section>

        {requestState.status === 'loading' && (
          <div className="dashboard-panel history-panel" role="status" aria-live="polite">
            <div className="skeleton-bar skeleton-bar--wide" aria-hidden="true" />
            <div className="skeleton-bar skeleton-bar--medium" aria-hidden="true" />
            <div className="skeleton-bar skeleton-bar--medium" aria-hidden="true" />
          </div>
        )}

        {requestState.status === 'error' && (
          <div className="dashboard-panel dashboard-error" role="alert">
            <div className="dashboard-error-copy">
              <span className="dashboard-error-mark" aria-hidden="true">!</span>
              <div>
                <h3>History unavailable</h3>
                <p>{requestState.message}</p>
              </div>
            </div>
          </div>
        )}

        {requestState.status === 'success' && (
          <>
            <section className="history-overview-grid" aria-label="History summary">
              <article className="dashboard-panel history-stat-card">
                <span className="history-stat-label">Total checks</span>
                <strong>{summary?.total ?? 0}</strong>
              </article>
              <article className="dashboard-panel history-stat-card history-stat-card--success">
                <span className="history-stat-label">Successful</span>
                <strong>{summary?.successful ?? 0}</strong>
              </article>
              <article className="dashboard-panel history-stat-card history-stat-card--warning">
                <span className="history-stat-label">Issues</span>
                <strong>{summary?.failed ?? 0}</strong>
              </article>
            </section>

            <section className="dashboard-panel history-table-panel" aria-labelledby="history-list-title">
              <div className="summary-section-heading">
                <div>
                  <h2 id="history-list-title">Recent activity</h2>
                  <p>Latest service checks captured by WakePulse.</p>
                </div>
              </div>

              {requestState.items.length === 0 ? (
                <p className="zero-services-note">No monitoring activity has been recorded yet.</p>
              ) : (
                <div className="history-table-wrap">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Status</th>
                        <th>Code</th>
                        <th>Response</th>
                        <th>Checked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestState.items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="history-service-name">{item.serviceName}</div>
                          </td>
                          <td>
                            <span className={statusTone[item.status]}>{statusLabel[item.status]}</span>
                          </td>
                          <td>{item.statusCode ?? '—'}</td>
                          <td>{item.responseTime !== null ? `${item.responseTime} ms` : '—'}</td>
                          <td>{formatDateTime(item.checkedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  )
}
