import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiRequestError } from '../api/request'
import { getMonitoringHistory } from '../api/history'
import { AppLayout } from '../components/AppLayout'
import type { DashboardActivityItem, DashboardCheckStatus } from '../types/dashboard'

type StatusFilter = 'all' | DashboardCheckStatus
type SortOrder = 'newest' | 'oldest'
type TableSort = 'checkedAt' | 'serviceName' | 'status'

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
  return Number.isNaN(date.getTime())
    ? 'Unknown time'
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

function getErrorMessage(error: unknown): string {
  return error instanceof ApiRequestError
    ? error.message
    : 'Unable to load monitoring history right now.'
}

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  return (
    <svg className={`history-sort-icon${active ? ' history-sort-icon--active' : ''}`} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {direction === 'asc' ? <path d="m4 10 4-4 4 4" /> : <path d="m4 6 4 4 4-4" />}
    </svg>
  )
}

export function HistoryPage() {
  const [items, setItems] = useState<DashboardActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([])
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [tableSort, setTableSort] = useState<TableSort>('checkedAt')
  const [tableDirection, setTableDirection] = useState<'asc' | 'desc'>('desc')
  const [total, setTotal] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller

    const debounce = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      getMonitoringHistory(pageSize, currentCursor, controller.signal, statusFilter, search, sortOrder)
        .then((page) => {
          if (controller.signal.aborted) return
          setItems(page.items)
          setNextCursor(page.nextCursor)
          setTotal(page.total)
          setLoading(false)
        })
        .catch((requestError: unknown) => {
          if (controller.signal.aborted) return
          setError(getErrorMessage(requestError))
          setLoading(false)
        })
    }, 180)

    return () => {
      window.clearTimeout(debounce)
      controller.abort()
    }
  }, [currentCursor, pageSize, retryCount, search, sortOrder, statusFilter])

  const sortedItems = useMemo(() => {
    const copied = [...items]
    copied.sort((left, right) => {
      let comparison: number
      if (tableSort === 'serviceName') {
        comparison = left.serviceName.localeCompare(right.serviceName)
      } else if (tableSort === 'status') {
        comparison = left.status.localeCompare(right.status)
      } else {
        comparison = new Date(left.checkedAt).getTime() - new Date(right.checkedAt).getTime()
      }
      return tableDirection === 'asc' ? comparison : -comparison
    })
    return copied
  }, [items, tableDirection, tableSort])

  const summary = useMemo(() => {
    const successful = items.filter((item) => item.status === 'success').length
    return {
      total: items.length,
      successful,
      issues: items.length - successful,
    }
  }, [items])

  const changeTableSort = (column: TableSort) => {
    if (tableSort === column) {
      setTableDirection((direction) => direction === 'asc' ? 'desc' : 'asc')
    } else {
      setTableSort(column)
      setTableDirection(column === 'checkedAt' ? 'desc' : 'asc')
    }
  }

  const resetToFirstPage = () => {
    setCursorStack([])
    setCurrentCursor(undefined)
  }

  const goNext = () => {
    if (!nextCursor) return
    setCursorStack((stack) => [...stack, currentCursor ?? null])
    setCurrentCursor(nextCursor)
  }

  const goPrevious = () => {
    setCursorStack((stack) => {
      const previous = stack[stack.length - 1]
      setCurrentCursor(previous ?? undefined)
      return stack.slice(0, -1)
    })
  }

  const retry = () => setRetryCount((count) => count + 1)

  const pageNumber = cursorStack.length + 1
  const pageStart = total === 0 ? 0 : ((pageNumber - 1) * pageSize) + 1
  const pageEnd = Math.min(pageNumber * pageSize, total)

  return (
    <AppLayout activePage="history">
      <div className="page-content" aria-busy={loading}>
        <section className="page-heading" aria-labelledby="history-title">
          <div>
            <p className="eyebrow">MONITORING HISTORY</p>
            <h1 id="history-title">Service check history</h1>
            <p className="page-description">Search, filter, sort, and inspect recorded monitoring checks.</p>
          </div>
        </section>

        <section className="history-overview-grid" aria-label="History summary">
          <article className="dashboard-panel history-stat-card">
            <span className="history-stat-label">Checks loaded</span>
            <strong>{summary.total}</strong>
          </article>
          <article className="dashboard-panel history-stat-card history-stat-card--success">
            <span className="history-stat-label">Successful</span>
            <strong>{summary.successful}</strong>
          </article>
          <article className="dashboard-panel history-stat-card history-stat-card--warning">
            <span className="history-stat-label">Issues</span>
            <strong>{summary.issues}</strong>
          </article>
        </section>

        <section className="dashboard-panel history-table-panel" aria-labelledby="history-list-title">
          <div className="history-toolbar">
            <div className="history-search-field">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="4.5" />
                <path d="m12 12 4 4" />
              </svg>
              <label className="visually-hidden" htmlFor="history-search">Search history</label>
              <input
                id="history-search"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.currentTarget.value)
                  resetToFirstPage()
                }}
                placeholder="Search services or status"
              />
            </div>
            <div className="history-toolbar-fields">
              <label>
                <span>Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.currentTarget.value as StatusFilter)
                    resetToFirstPage()
                  }}
                >
                  <option value="all">All statuses</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="timeout">Timeout</option>
                  <option value="error">Error</option>
                </select>
              </label>
              <label>
                <span>Sort</span>
                <select
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(event.currentTarget.value as SortOrder)
                    resetToFirstPage()
                  }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
              <label>
                <span>Rows</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.currentTarget.value))
                    resetToFirstPage()
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
          </div>

          {loading && (
            <div className="history-loading" role="status" aria-live="polite">
              <span className="visually-hidden">Loading monitoring history…</span>
              {Array.from({ length: 5 }, (_, index) => (
                <span className="skeleton-bar skeleton-bar--medium" key={index} />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="dashboard-error" role="alert">
              <div className="dashboard-error-copy">
                <span className="dashboard-error-mark" aria-hidden="true">!</span>
                <div><h3>History unavailable</h3><p>{error}</p></div>
              </div>
              <button className="dashboard-retry-button" type="button" onClick={retry}>Try again</button>
            </div>
          )}

          {!loading && !error && (
            <>
              {sortedItems.length === 0 ? (
                <p className="zero-services-note">No monitoring activity matches these filters.</p>
              ) : (
                <div className="history-table-wrap" tabIndex={0}>
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" onClick={() => changeTableSort('serviceName')}>
                            Service <SortIcon active={tableSort === 'serviceName'} direction={tableDirection} />
                          </button>
                        </th>
                        <th>
                          <button type="button" onClick={() => changeTableSort('status')}>
                            Status <SortIcon active={tableSort === 'status'} direction={tableDirection} />
                          </button>
                        </th>
                        <th>Code</th>
                        <th>Response</th>
                        <th>
                          <button type="button" onClick={() => changeTableSort('checkedAt')}>
                            Checked <SortIcon active={tableSort === 'checkedAt'} direction={tableDirection} />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map((item) => (
                        <tr key={item.id}>
                          <td data-label="Service"><div className="history-service-name">{item.serviceName}</div></td>
                          <td data-label="Status"><span className={statusTone[item.status]}>{statusLabel[item.status]}</span></td>
                          <td data-label="Code">{item.statusCode ?? '—'}</td>
                          <td data-label="Response">{item.responseTime !== null ? `${item.responseTime} ms` : '—'}</td>
                          <td data-label="Checked"><time dateTime={item.checkedAt}>{formatDateTime(item.checkedAt)}</time></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="history-pagination">
                <span>{total > 0 ? `${pageStart}–${pageEnd} of ${total}` : '0 results'}</span>
                <div>
                  <button type="button" onClick={goPrevious} disabled={cursorStack.length === 0} aria-label="Previous page" title="Previous page">
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m12 5-5 5 5 5" /></svg>
                  </button>
                  <span>{pageNumber}</span>
                  <button type="button" onClick={goNext} disabled={!nextCursor} aria-label="Next page" title="Next page">
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" /></svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
