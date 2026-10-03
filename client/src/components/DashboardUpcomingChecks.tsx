import type {
  DashboardServiceProvider,
  DashboardServiceStatus,
  DashboardUpcomingItem,
} from '../types/dashboard'

interface DashboardUpcomingChecksProps {
  upcoming: DashboardUpcomingItem[]
}

const providerLabels: Record<DashboardServiceProvider, string> = {
  render: 'Render',
  railway: 'Railway',
  fly: 'Fly.io',
  koyeb: 'Koyeb',
  vercel: 'Vercel',
  custom: 'Custom',
}

const serviceStatusLabels: Record<DashboardServiceStatus, string> = {
  unknown: 'Unknown',
  online: 'Online',
  offline: 'Offline',
  disabled: 'Disabled',
}

function formatNextCheckAt(value: string): string {
  const nextCheckAt = new Date(value)

  if (Number.isNaN(nextCheckAt.getTime())) {
    return 'Time unavailable'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(nextCheckAt)
}

function formatCheckInterval(intervalSeconds: number): string {
  const secondsPerMinute = 60
  const secondsPerHour = 60 * secondsPerMinute
  const secondsPerDay = 24 * secondsPerHour

  if (intervalSeconds % secondsPerDay === 0) {
    const days = intervalSeconds / secondsPerDay
    return `Every ${days} ${days === 1 ? 'day' : 'days'}`
  }

  if (intervalSeconds % secondsPerHour === 0) {
    const hours = intervalSeconds / secondsPerHour
    return `Every ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }

  if (intervalSeconds % secondsPerMinute === 0) {
    const minutes = intervalSeconds / secondsPerMinute
    return `Every ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  }

  if (intervalSeconds < secondsPerMinute) {
    return `Every ${intervalSeconds} ${intervalSeconds === 1 ? 'second' : 'seconds'}`
  }

  const minutes = Math.floor(intervalSeconds / secondsPerMinute)
  const remainingSeconds = intervalSeconds % secondsPerMinute
  return `Every ${minutes} min ${remainingSeconds} sec`
}

function UpcomingCheck({ item }: { item: DashboardUpcomingItem }) {
  const formattedTime = formatNextCheckAt(item.nextCheckAt)

  return (
    <li className="upcoming-check-item">
      <div className="upcoming-check-heading">
        <div className="upcoming-service">
          <span className="upcoming-service-name">{item.name}</span>
          <span className="upcoming-provider">{providerLabels[item.provider]}</span>
        </div>
        <span className={`upcoming-status upcoming-status--${item.status}`}>
          <span className="upcoming-status-mark" aria-hidden="true" />
          {serviceStatusLabels[item.status]}
        </span>
      </div>
      <div className="upcoming-check-details">
        <span className="upcoming-detail">
          <span className="upcoming-detail-label">Next check</span>
          <time dateTime={item.nextCheckAt}>{formattedTime}</time>
        </span>
        <span className="upcoming-detail">
          <span className="upcoming-detail-label">Interval</span>
          <span>{formatCheckInterval(item.intervalSeconds)}</span>
        </span>
      </div>
    </li>
  )
}

export function DashboardUpcomingChecks({
  upcoming,
}: DashboardUpcomingChecksProps) {
  // The backend already filters disabled services; this keeps the UI defensive
  // if an inconsistent disabled status is ever returned in the upcoming list.
  const enabledUpcoming = upcoming.filter((item) => item.status !== 'disabled')

  return (
    <section className="dashboard-panel upcoming-panel" aria-labelledby="upcoming-checks-title">
      <div className="panel-heading">
        <div>
          <h2 id="upcoming-checks-title">Upcoming checks</h2>
          <p>See what the monitoring scheduler will check next.</p>
        </div>
        <span className="activity-window-label">Scheduled</span>
      </div>

      {enabledUpcoming.length === 0 ? (
        <div className="upcoming-empty-state" role="status">
          <h3>No upcoming checks</h3>
          <p>Enabled services with a scheduled check will appear here.</p>
        </div>
      ) : (
        <ul className="upcoming-check-list" aria-label="Scheduled service checks">
          {enabledUpcoming.map((item) => (
            <UpcomingCheck item={item} key={item.id} />
          ))}
        </ul>
      )}
    </section>
  )
}

export function DashboardUpcomingChecksSkeleton() {
  return (
    <section className="dashboard-panel upcoming-panel" aria-labelledby="upcoming-checks-loading-title">
      <div className="panel-heading">
        <div>
          <h2 id="upcoming-checks-loading-title">Upcoming checks</h2>
          <p>See what the monitoring scheduler will check next.</p>
        </div>
      </div>
      <div
        className="upcoming-loading-list"
        role="status"
        aria-label="Loading upcoming checks"
        aria-busy="true"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <div className="upcoming-loading-row" key={index} aria-hidden="true">
            <span className="skeleton-bar skeleton-bar--label" />
            <span className="skeleton-bar skeleton-bar--description" />
          </div>
        ))}
      </div>
    </section>
  )
}
