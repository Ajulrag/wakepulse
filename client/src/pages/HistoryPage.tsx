import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiRequestError } from '../api/request'
import { getMonitoringHistory } from '../api/history'
import { AppLayout } from '../components/AppLayout'
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

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message
  }

  return 'Unable to load monitoring history right now.'
}

export function HistoryPage() {
  const [requestState, setRequestState] = useState<
    | { status: 'loading' }
    | { status: 'success'; items: DashboardActivityItem[] }
    | { status: 'error'; message: string }
  >({ status: 'loading' })
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const loadMoreLock = useRef(false)
  const loadMoreController = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    getMonitoringHistory(20, undefined, controller.signal)
      .then((page) => {
        setRequestState({ status: 'success', items: page.items })
        setNextCursor(page.nextCursor)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setRequestState({ status: 'error', message: getErrorMessage(error) })
        }
      })

    return () => controller.abort()
  }, [retryCount])

  useEffect(() => () => loadMoreController.current?.abort(), [])

  const summary = useMemo(() => {
    if (requestState.status !== 'success') {
      return null
    }

    const successful = requestState.items.filter(
      (item) => item.status === 'success',
    ).length

    return {
      total: requestState.items.length,
      successful,
      issues: requestState.items.length - successful,
    }
  }, [requestState])

  const retry = () => {
    setNextCursor(null)
    setLoadMoreError(null)
    setRequestState({ status: 'loading' })
    setRetryCount((count) => count + 1)
  }

  const loadOlderChecks = async () => {
    if (
      !nextCursor ||
      requestState.status !== 'success' ||
      loadMoreLock.current
    ) {
      return
    }

    loadMoreLock.current = true
    setIsLoadingMore(true)
    setLoadMoreError(null)
    const controller = new AbortController()
    loadMoreController.current = controller

    try {
      const page = await getMonitoringHistory(20, nextCursor, controller.signal)
      setRequestState((current) => {
        if (current.status !== 'success') {
          return current
        }

        const existingIds = new Set(current.items.map((item) => item.id))
        return {
          status: 'success',
          items: [
            ...current.items,
            ...page.items.filter((item) => !existingIds.has(item.id)),
          ],
        }
      })
      setNextCursor(page.nextCursor)
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        setLoadMoreError(getErrorMessage(error))
      }
    } finally {
      loadMoreLock.current = false
      loadMoreController.current = null
      setIsLoadingMore(false)
    }
  }

  return (
    <AppLayout activePage="history">
      <div className="page-content" aria-busy={requestState.status === 'loading'}>
        <section className="page-heading" aria-labelledby="history-title">
          <div>
            <p className="eyebrow">MONITORING HISTORY</p>
            <h1 id="history-title">Service check history</h1>
            <p className="page-description">
              Review recorded checks across your services. Load older results
              when you need more context.
            </p>
          </div>
        </section>

        {requestState.status === 'loading' && (
          <div className="dashboard-panel history-panel" role="status" aria-live="polite">
            <span className="visually-hidden">Loading monitoring history…</span>
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
            <button className="dashboard-retry-button" type="button" onClick={retry}>
              Try again
            </button>
          </div>
        )}

        {requestState.status === 'success' && (
          <>
            <section className="history-overview-grid" aria-label="Loaded history summary">
              <article className="dashboard-panel history-stat-card">
                <span className="history-stat-label">Checks loaded</span>
                <strong>{summary?.total ?? 0}</strong>
              </article>
              <article className="dashboard-panel history-stat-card history-stat-card--success">
                <span className="history-stat-label">Successful</span>
                <strong>{summary?.successful ?? 0}</strong>
              </article>
              <article className="dashboard-panel history-stat-card history-stat-card--warning">
                <span className="history-stat-label">Issues</span>
                <strong>{summary?.issues ?? 0}</strong>
              </article>
            </section>

            <section className="dashboard-panel history-table-panel" aria-labelledby="history-list-title">
              <div className="summary-section-heading">
                <div>
                  <h2 id="history-list-title">Recorded activity</h2>
                  <p>Counts above reflect the records loaded in this view.</p>
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
                          <td data-label="Service">
                            <div className="history-service-name">{item.serviceName}</div>
                          </td>
                          <td data-label="Status">
                            <span className={statusTone[item.status]}>{statusLabel[item.status]}</span>
                          </td>
                          <td data-label="Code">{item.statusCode ?? '—'}</td>
                          <td data-label="Response">
                            {item.responseTime !== null ? `${item.responseTime} ms` : '—'}
                          </td>
                          <td data-label="Checked">
                            <time dateTime={item.checkedAt}>{formatDateTime(item.checkedAt)}</time>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {loadMoreError && (
                <div className="history-load-more-error" role="alert">
                  <span>{loadMoreError}</span>
                  <button
                    className="dashboard-retry-button"
                    type="button"
                    onClick={() => void loadOlderChecks()}
                  >
                    Retry
                  </button>
                </div>
              )}

              {nextCursor && (
                <div className="history-load-more">
                  <button
                    className="dashboard-retry-button"
                    type="button"
                    onClick={() => void loadOlderChecks()}
                    disabled={isLoadingMore}
                    aria-busy={isLoadingMore}
                  >
                    {isLoadingMore ? 'Loading older checks…' : 'Load older checks'}
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  )
}
