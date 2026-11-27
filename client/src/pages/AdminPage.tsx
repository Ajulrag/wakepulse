import { useEffect, useMemo, useState } from 'react'
import {
  deleteAdminService,
  getAdminAnalytics,
  getAdminDashboard,
  getAdminServices,
  getAdminUsers,
  updateAdminService,
  updateAdminUser,
} from '../api/admin'
import { ApiRequestError } from '../api/request'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../context/useAuth'
import type {
  AdminDashboardData,
  AdminPage as AdminPageResult,
  AdminService,
  AdminUser,
  VisitorAnalytics,
} from '../types/admin'
import '../App.css'
import './AdminPage.css'

type AdminTab = 'overview' | 'users' | 'services' | 'analytics'

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not checked yet'
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function MetricCard({
  label,
  value,
  detail,
  tone = 'teal',
}: {
  label: string
  value: number
  detail: string
  tone?: 'teal' | 'blue' | 'violet' | 'amber'
}) {
  return (
    <article className={`admin-metric-card admin-metric-card--${tone}`}>
      <span className="admin-metric-label">{label}</span>
      <strong>{value.toLocaleString()}</strong>
      <span className="admin-metric-detail">{detail}</span>
    </article>
  )
}

function VisitorChart({ analytics }: { analytics: VisitorAnalytics }) {
  const maxViews = Math.max(
    1,
    ...analytics.daily.map((day) => day.pageViews),
  )

  return (
    <section className="admin-panel" aria-labelledby="traffic-chart-title">
      <div className="admin-panel-heading">
        <div>
          <h2 id="traffic-chart-title">Visitor activity</h2>
          <p>Daily page views and unique anonymous sessions</p>
        </div>
        <span className="admin-period-label">Last {analytics.days} days</span>
      </div>
      <div
        className="admin-chart"
        role="img"
        aria-label="Daily page views chart"
        style={{
          gridTemplateColumns: `repeat(${analytics.daily.length}, minmax(18px, 1fr))`,
        }}
      >
        {analytics.daily.map((day) => (
          <div className="admin-chart-column" key={day.date}>
            <span className="admin-chart-value">{day.pageViews}</span>
            <div className="admin-chart-track">
              <span
                className="admin-chart-bar"
                style={{
                  height: `${Math.max(4, (day.pageViews / maxViews) * 100)}%`,
                }}
              />
            </div>
            <span className="admin-chart-date">
              {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        ))}
      </div>
      <div className="admin-chart-legend">
        <span><i className="admin-chart-legend-dot" /> Page views</span>
        <span>{analytics.uniqueVisitors.toLocaleString()} unique sessions</span>
      </div>
    </section>
  )
}

function AdminPagination({
  data,
  onChange,
}: {
  data: AdminPageResult<unknown>
  onChange: (page: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize))
  return (
    <div className="admin-pagination">
      <span>
        {data.total === 0
          ? 'No records'
          : `Page ${data.page} of ${pageCount} · ${data.total.toLocaleString()} records`}
      </span>
      <div>
        <button
          type="button"
          className="admin-secondary-button"
          disabled={data.page <= 1}
          onClick={() => onChange(data.page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="admin-secondary-button"
          disabled={data.page >= pageCount}
          onClick={() => onChange(data.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export function AdminPage() {
  const { state: authState, refreshUser } = useAuth()
  const [tab, setTab] = useState<AdminTab>('overview')
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)
  const [users, setUsers] = useState<AdminPageResult<AdminUser> | null>(null)
  const [services, setServices] = useState<AdminPageResult<AdminService> | null>(
    null,
  )
  const [analytics, setAnalytics] = useState<VisitorAnalytics | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [analyticsDays, setAnalyticsDays] = useState(14)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const currentUserId =
    authState.status === 'authenticated' ? authState.user.id : ''

  const refreshData = () => {
    setLoading(true)
    setError('')
    setRefreshKey((key) => key + 1)
  }

  const changeSearch = (value: string) => {
    setLoading(true)
    setError('')
    setSearch(value)
    setPage(1)
  }

  const changePage = (value: number) => {
    setLoading(true)
    setError('')
    setPage(value)
  }

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      try {
        if (tab === 'overview') {
          setDashboard(await getAdminDashboard(controller.signal))
        } else if (tab === 'users') {
          setUsers(await getAdminUsers(page, search, controller.signal))
        } else if (tab === 'services') {
          setServices(await getAdminServices(page, search, controller.signal))
        } else {
          setAnalytics(
            await getAdminAnalytics(analyticsDays, controller.signal),
          )
        }
      } catch (requestError: unknown) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(requestError))
          if (
            requestError instanceof ApiRequestError &&
            (requestError.status === 401 || requestError.status === 403)
          ) {
            void refreshUser()
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => controller.abort()
  }, [tab, page, search, analyticsDays, refreshKey, refreshUser])

  const pageTitle = useMemo(
    () => ({
      overview: 'Overview',
      users: 'Users & accounts',
      services: 'Services',
      analytics: 'Visitor analytics',
    })[tab],
    [tab],
  )

  const handleUserChange = async (
    user: AdminUser,
    change: { role?: 'user' | 'admin'; isActive?: boolean },
  ) => {
    setPendingId(user.id)
    setError('')
    try {
      await updateAdminUser(user.id, change)
      refreshData()
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
      if (
        requestError instanceof ApiRequestError &&
        (requestError.status === 401 || requestError.status === 403)
      ) {
        void refreshUser()
      }
    } finally {
      setPendingId(null)
    }
  }

  const handleServiceToggle = async (service: AdminService) => {
    setPendingId(service.id)
    setError('')
    try {
      await updateAdminService(service.id, !service.enabled)
      refreshData()
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
      if (
        requestError instanceof ApiRequestError &&
        (requestError.status === 401 || requestError.status === 403)
      ) {
        void refreshUser()
      }
    } finally {
      setPendingId(null)
    }
  }

  const handleServiceDelete = async (service: AdminService) => {
    if (
      !window.confirm(
        `Delete "${service.name}" and its monitoring history? This cannot be undone.`,
      )
    ) {
      return
    }
    setPendingId(service.id)
    setError('')
    try {
      await deleteAdminService(service.id)
      refreshData()
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
      if (
        requestError instanceof ApiRequestError &&
        (requestError.status === 401 || requestError.status === 403)
      ) {
        void refreshUser()
      }
    } finally {
      setPendingId(null)
    }
  }

  const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users & accounts' },
    { id: 'services', label: 'Services' },
    { id: 'analytics', label: 'Visitor analytics' },
  ]

  return (
    <AppLayout activePage="admin">
      <div className="page-content admin-page-content">
        <section className="admin-page-heading">
          <div>
            <p className="eyebrow">WAKEPULSE CONTROL CENTER</p>
            <h1>Administration</h1>
            <p>Manage accounts, monitor services, and understand site activity.</p>
          </div>
          <button
            type="button"
            className="admin-refresh-button"
            onClick={refreshData}
            disabled={loading || pendingId !== null}
          >
            <span aria-hidden="true">↻</span>
            Refresh
          </button>
        </section>

        <nav className="admin-tabs" aria-label="Admin sections">
          {tabs.map((item) => (
            <button
              type="button"
              key={item.id}
              className={tab === item.id ? 'admin-tab admin-tab--active' : 'admin-tab'}
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => {
                setTab(item.id)
                setPage(1)
                setLoading(true)
                setError('')
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {error && (
          <div className="admin-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={refreshData}>
              Retry
            </button>
          </div>
        )}

        {loading && (
          <div className="admin-loading" role="status" aria-live="polite">
            Loading {pageTitle.toLowerCase()}…
          </div>
        )}

        {!loading && tab === 'overview' && dashboard && (
          <>
            <section className="admin-metric-grid" aria-label="Workspace totals">
              <MetricCard
                label="Total accounts"
                value={dashboard.overview.totalUsers}
                detail={`${dashboard.overview.activeUsers} active`}
              />
              <MetricCard
                label="Admin accounts"
                value={dashboard.overview.adminUsers}
                detail="Active administrators"
                tone="violet"
              />
              <MetricCard
                label="Monitored services"
                value={dashboard.overview.totalServices}
                detail={`${dashboard.overview.enabledServices} enabled`}
                tone="blue"
              />
              <MetricCard
                label="Visitor sessions"
                value={dashboard.analytics.uniqueVisitors}
                detail={`Last ${dashboard.analytics.days} days`}
                tone="amber"
              />
            </section>
            <div className="admin-overview-grid">
              <VisitorChart analytics={dashboard.analytics} />
              <section className="admin-panel" aria-labelledby="admin-health-title">
                <div className="admin-panel-heading">
                  <div>
                    <h2 id="admin-health-title">Service health</h2>
                    <p>Current state across all customer services</p>
                  </div>
                </div>
                <div className="admin-health-list">
                  <div><span className="admin-health-dot admin-health-dot--online" />Online<strong>{dashboard.overview.onlineServices}</strong></div>
                  <div><span className="admin-health-dot admin-health-dot--offline" />Offline<strong>{dashboard.overview.offlineServices}</strong></div>
                  <div><span className="admin-health-dot admin-health-dot--disabled" />Disabled<strong>{dashboard.overview.disabledServices}</strong></div>
                </div>
                <div className="admin-top-pages">
                  <h3>Popular pages</h3>
                  {dashboard.analytics.topPages.length === 0 ? (
                    <p>No visitor activity recorded yet.</p>
                  ) : (
                    dashboard.analytics.topPages.map((item) => (
                      <div key={item.path}>
                        <code>{item.path}</code>
                        <strong>{item.pageViews.toLocaleString()}</strong>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
            <p className="admin-privacy-note">
              Analytics use temporary anonymous session IDs and normalized page paths.
              IP addresses, account identities, and URL query strings are not stored.
            </p>
          </>
        )}

        {!loading && tab === 'users' && (
          <section className="admin-panel admin-table-panel">
            <div className="admin-panel-heading admin-table-heading">
              <div>
                <h2>Users & accounts</h2>
                <p>Review access, assign administrator roles, or suspend accounts.</p>
              </div>
              <label className="admin-search">
                <span className="sr-only">Search users</span>
                <input
                  type="search"
                  placeholder="Search name or email"
                  value={search}
                  onChange={(event) => changeSearch(event.target.value)}
                  maxLength={100}
                />
              </label>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {(users?.items ?? []).map((user) => {
                    const isSelf = user.id === currentUserId
                    const busy = pendingId === user.id
                    return (
                      <tr key={user.id}>
                        <td>
                          <strong>{user.name}{isSelf ? ' (you)' : ''}</strong>
                          <span>{user.email}</span>
                        </td>
                        <td>
                          <span className={`admin-badge ${user.role === 'admin' ? 'admin-badge--admin' : ''}`}>
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-badge ${user.isActive ? 'admin-badge--active' : 'admin-badge--inactive'}`}>
                            {user.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>
                          {isSelf ? (
                            <span className="admin-self-label">Your account</span>
                          ) : (
                            <div className="admin-row-actions">
                              <button
                                type="button"
                                className="admin-secondary-button"
                                disabled={busy}
                                onClick={() =>
                                  void handleUserChange(user, {
                                    role: user.role === 'admin' ? 'user' : 'admin',
                                  })
                                }
                              >
                                {user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                              </button>
                              <button
                                type="button"
                                className="admin-text-button"
                                disabled={busy}
                                onClick={() =>
                                  void handleUserChange(user, {
                                    isActive: !user.isActive,
                                  })
                                }
                              >
                                {user.isActive ? 'Suspend' : 'Restore'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {users?.items.length === 0 && (
                    <tr><td className="admin-empty" colSpan={5}>No accounts match your search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {users && <AdminPagination data={users} onChange={changePage} />}
          </section>
        )}

        {!loading && tab === 'services' && (
          <section className="admin-panel admin-table-panel">
            <div className="admin-panel-heading admin-table-heading">
              <div>
                <h2>All monitored services</h2>
                <p>Pause or remove a service across any customer account.</p>
              </div>
              <label className="admin-search">
                <span className="sr-only">Search services</span>
                <input
                  type="search"
                  placeholder="Search service, URL, or provider"
                  value={search}
                  onChange={(event) => changeSearch(event.target.value)}
                  maxLength={100}
                />
              </label>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Owner</th>
                    <th>Health</th>
                    <th>Monitoring</th>
                    <th>Last checked</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {(services?.items ?? []).map((service) => (
                    <tr key={service.id}>
                      <td>
                        <strong>{service.name}</strong>
                        <span>{service.provider} · {service.url}</span>
                      </td>
                      <td>
                        <strong>{service.ownerName}</strong>
                        <span>{service.ownerEmail || 'Account unavailable'}</span>
                      </td>
                      <td>
                        <span className={`admin-badge admin-badge--${service.status}`}>
                          {service.status}
                        </span>
                      </td>
                      <td>{service.enabled ? 'Enabled' : 'Paused'}</td>
                      <td>{formatDate(service.lastCheckedAt)}</td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-secondary-button"
                            disabled={pendingId === service.id}
                            onClick={() => void handleServiceToggle(service)}
                          >
                            {service.enabled ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            type="button"
                            className="admin-text-button admin-text-button--danger"
                            disabled={pendingId === service.id}
                            onClick={() => void handleServiceDelete(service)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {services?.items.length === 0 && (
                    <tr><td className="admin-empty" colSpan={6}>No services match your search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {services && <AdminPagination data={services} onChange={changePage} />}
          </section>
        )}

        {!loading && tab === 'analytics' && analytics && (
          <>
            <section className="admin-analytics-toolbar">
              <div>
                <h2>Anonymous site traffic</h2>
                <p>Visitor sessions are measured without collecting IP addresses or account IDs.</p>
              </div>
              <label>
                <span>Reporting period</span>
                <select
                  value={analyticsDays}
                  onChange={(event) => {
                    setLoading(true)
                    setError('')
                    setAnalyticsDays(Number(event.target.value))
                  }}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                </select>
              </label>
            </section>
            <section className="admin-metric-grid admin-analytics-metrics">
              <MetricCard label="Unique sessions" value={analytics.uniqueVisitors} detail={`Across ${analytics.days} days`} />
              <MetricCard label="Page views" value={analytics.pageViews} detail="Recorded page navigations" tone="blue" />
              <MetricCard label="Tracked pages" value={analytics.topPages.length} detail="Top pages in this period" tone="violet" />
            </section>
            <VisitorChart analytics={analytics} />
            <section className="admin-panel admin-top-pages-panel">
              <div className="admin-panel-heading">
                <div><h2>Most visited pages</h2><p>Aggregated page views for the selected period</p></div>
              </div>
              {analytics.topPages.length === 0 ? (
                <p className="admin-empty-copy">No visitor activity recorded yet.</p>
              ) : (
                <div className="admin-top-pages">
                  {analytics.topPages.map((item, index) => (
                    <div key={item.path}>
                      <span className="admin-page-rank">{index + 1}</span>
                      <code>{item.path}</code>
                      <strong>{item.pageViews.toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <p className="admin-privacy-note">
              Page-view events expire automatically after 90 days. Sessions are held in
              session storage, and the tracker respects the browser’s Do Not Track setting.
            </p>
          </>
        )}
      </div>
    </AppLayout>
  )
}
