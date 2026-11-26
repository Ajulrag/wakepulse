import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardApiError, getDashboardOverview } from '../api/dashboard'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../context/useAuth'
import { loadWorkspacePreferences } from '../preferences'
import {
  DashboardSummaryCards,
  DashboardSummaryCardsSkeleton,
} from '../components/DashboardSummaryCards'
import {
  DashboardMonitoringStatistics,
  DashboardMonitoringStatisticsSkeleton,
} from '../components/DashboardMonitoringStatistics'
import {
  DashboardRecentActivity,
  DashboardRecentActivitySkeleton,
} from '../components/DashboardRecentActivity'
import {
  DashboardUpcomingChecks,
  DashboardUpcomingChecksSkeleton,
} from '../components/DashboardUpcomingChecks'
import type { DashboardOverview } from '../types/dashboard'
import '../App.css'

type DashboardRequestState =
  | { status: 'loading' }
  | { status: 'success'; dashboard: DashboardOverview }
  | { status: 'error'; message: string; authenticationRequired: boolean }

export function DashboardPage() {
  const { refreshUser } = useAuth()
  const [preferences] = useState(loadWorkspacePreferences)
  const [requestState, setRequestState] = useState<DashboardRequestState>({
    status: 'loading',
  })
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let activeController: AbortController | null = null

    const loadDashboard = () => {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller

      getDashboardOverview(controller.signal)
        .then((dashboard) => {
          setRequestState({ status: 'success', dashboard })
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return
          }

          const authenticationRequired =
            error instanceof DashboardApiError && error.status === 401
          setRequestState({
            status: 'error',
            message:
              error instanceof DashboardApiError
                ? error.message
                : 'Unable to load the dashboard. Please try again.',
            authenticationRequired,
          })

          if (authenticationRequired) {
            void refreshUser()
          }
        })
    }

    loadDashboard()
    const refreshTimer = preferences.autoRefresh
      ? window.setInterval(() => {
          if (document.visibilityState === 'visible') {
            loadDashboard()
          }
        }, 60_000)
      : null

    return () => {
      if (refreshTimer !== null) {
        window.clearInterval(refreshTimer)
      }
      activeController?.abort()
    }
  }, [preferences.autoRefresh, refreshUser, retryCount])

  const retryDashboard = async () => {
    if (
      requestState.status === 'error' &&
      requestState.authenticationRequired
    ) {
      await refreshUser()
    }

    setRequestState({ status: 'loading' })
    setRetryCount((count) => count + 1)
  }

  return (
    <AppLayout activePage="dashboard">
        <div
          className={`page-content${preferences.compactCards ? ' page-content--compact' : ''}`}
          aria-busy={requestState.status === 'loading'}
        >
          <section className="page-heading" aria-labelledby="page-title">
            <div>
              <p className="eyebrow">OVERVIEW</p>
              <h1 id="page-title">Dashboard</h1>
              <p className="page-description">
                Keep an eye on service health, recent checks, and what is coming up.
              </p>
            </div>
            <div className="dashboard-heading-actions">
              <span className="dashboard-live-state">
                <span aria-hidden="true" />
                Workspace live
              </span>
              <Link className="dashboard-add-service" to="/services">
                Manage services
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>

          <section className="summary-section" aria-labelledby="summary-title">
            <div className="summary-section-heading">
              <div>
                <h2 id="summary-title">Service summary</h2>
                <p>Availability and monitoring totals across your workspace.</p>
              </div>
            </div>

            {requestState.status === 'loading' && <DashboardSummaryCardsSkeleton />}

            {requestState.status === 'error' && (
              <div className="dashboard-error" role="alert">
                <div className="dashboard-error-copy">
                  <span className="dashboard-error-mark" aria-hidden="true">
                    !
                  </span>
                  <div>
                    <h3>
                      {requestState.authenticationRequired
                        ? 'Sign in required'
                        : 'Dashboard unavailable'}
                    </h3>
                    <p>{requestState.message}</p>
                  </div>
                </div>
                <button
                  className="dashboard-retry-button"
                  type="button"
                  onClick={() => void retryDashboard()}
                >
                  {requestState.authenticationRequired
                    ? 'Retry after signing in'
                    : 'Try again'}
                </button>
              </div>
            )}

            {requestState.status === 'success' && (
              <>
                <DashboardSummaryCards summary={requestState.dashboard.summary} />
                {requestState.dashboard.summary.totalServices === 0 && (
                  <div className="dashboard-zero-state" role="status">
                    <div>
                      <strong>Start monitoring your first service</strong>
                      <p>Add an endpoint, check interval, and timeout to begin collecting health data.</p>
                    </div>
                    <Link className="dashboard-empty-action" to="/services">
                      Add your first service
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                )}
              </>
            )}
          </section>

          {requestState.status === 'loading' && (
            <DashboardMonitoringStatisticsSkeleton />
          )}

          {requestState.status === 'success' && (
            <DashboardMonitoringStatistics stats={requestState.dashboard.stats} />
          )}

          <div className="dashboard-detail-grid">
            {requestState.status === 'loading' && <DashboardRecentActivitySkeleton />}
            {requestState.status === 'success' && (
              <DashboardRecentActivity activity={requestState.dashboard.activity} />
            )}

            {requestState.status === 'loading' && <DashboardUpcomingChecksSkeleton />}
            {requestState.status === 'success' && (
              <DashboardUpcomingChecks upcoming={requestState.dashboard.upcoming} />
            )}
          </div>
      </div>
    </AppLayout>
  )
}
