import { useEffect, useState } from 'react'
import { DashboardApiError, getDashboardOverview } from '../api/dashboard'
import { AppLayout } from '../components/AppLayout'
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
  const [requestState, setRequestState] = useState<DashboardRequestState>({
    status: 'loading',
  })
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getDashboardOverview(controller.signal)
      .then((dashboard) => {
        setRequestState({ status: 'success', dashboard })
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
              : 'Unable to load the dashboard. Please try again.',
          authenticationRequired:
            error instanceof DashboardApiError && error.status === 401,
        })
      })

    return () => controller.abort()
  }, [retryCount])

  const retryDashboard = () => {
    setRequestState({ status: 'loading' })
    setRetryCount((count) => count + 1)
  }

  return (
    <AppLayout activePage="dashboard">
        <div className="page-content" aria-busy={requestState.status === 'loading'}>
          <section className="page-heading" aria-labelledby="page-title">
            <div>
              <p className="eyebrow">OVERVIEW</p>
              <h1 id="page-title">Dashboard</h1>
              <p className="page-description">
                Keep an eye on service health, recent checks, and what is coming up.
              </p>
            </div>
            <div className="heading-decoration" aria-hidden="true">
              <span className="decoration-orbit decoration-orbit--outer" />
              <span className="decoration-orbit decoration-orbit--inner" />
              <span className="decoration-core" />
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
                  onClick={retryDashboard}
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
                  <p className="zero-services-note" role="status">
                    No services are configured yet. Service health and check history
                    will appear here once a service is configured.
                  </p>
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

          {requestState.status === 'loading' && <DashboardRecentActivitySkeleton />}

          {requestState.status === 'success' && (
            <DashboardRecentActivity activity={requestState.dashboard.activity} />
          )}

          {requestState.status === 'loading' && <DashboardUpcomingChecksSkeleton />}

          {requestState.status === 'success' && (
            <DashboardUpcomingChecks upcoming={requestState.dashboard.upcoming} />
          )}
      </div>
    </AppLayout>
  )
}
