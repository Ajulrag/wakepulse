import type {
  DashboardActivityItem,
  DashboardCheckStatus,
} from '../types/dashboard'

interface DashboardRecentActivityProps {
  activity: DashboardActivityItem[]
}

const statusLabels: Record<DashboardCheckStatus, string> = {
  success: 'Success',
  failed: 'Failed',
  timeout: 'Timeout',
  error: 'Error',
}

function removeControlCharacters(value: string): string {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127 ? ' ' : character
  }).join('')
}

function formatCheckedAt(value: string): string {
  const checkedAt = new Date(value)

  if (Number.isNaN(checkedAt.getTime())) {
    return 'Time unavailable'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(checkedAt)
}

function getSafeErrorMessage(value: string): string {
  const firstLine = value.split(/\r?\n/, 1)[0] ?? ''
  const safeMessage = removeControlCharacters(firstLine)
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[target URL]')
    .replace(/\b(password|token|secret|authorization)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .replace(/\s+/g, ' ')
    .trim()

  if (!safeMessage) {
    return 'No additional details are available.'
  }

  const maxLength = 180
  return safeMessage.length > maxLength
    ? `${safeMessage.slice(0, maxLength - 1).trimEnd()}…`
    : safeMessage
}

function ActivityItem({ item }: { item: DashboardActivityItem }) {
  const formattedTime = formatCheckedAt(item.checkedAt)
  const errorMessage = item.error?.trim()
    ? getSafeErrorMessage(item.error)
    : null

  return (
    <li className="activity-item">
      <div className="activity-item-heading">
        <div className="activity-service">
          <span
            className={`activity-status-mark activity-status-mark--${item.status}`}
            aria-hidden="true"
          />
          <span className="activity-service-name">{item.serviceName}</span>
        </div>
        <span className={`activity-status activity-status--${item.status}`}>
          {statusLabels[item.status]}
        </span>
      </div>

      <div className="activity-details">
        <span>
          <span className="activity-detail-label">HTTP</span>
          {item.statusCode === null ? '—' : item.statusCode}
        </span>
        <span>
          <span className="activity-detail-label">Response</span>
          {item.responseTime === null
            ? '—'
            : `${item.responseTime.toLocaleString()} ms`}
        </span>
        <time dateTime={item.checkedAt}>{formattedTime}</time>
      </div>

      {errorMessage && item.status !== 'success' && (
        <p className="activity-error">
          <span>Error details</span>
          {errorMessage}
        </p>
      )}
    </li>
  )
}

export function DashboardRecentActivity({
  activity,
}: DashboardRecentActivityProps) {
  return (
    <section className="dashboard-panel activity-panel" aria-labelledby="recent-activity-title">
      <div className="panel-heading">
        <div>
          <h2 id="recent-activity-title">Recent activity</h2>
          <p>The latest checks across your services.</p>
        </div>
        <span className="activity-window-label">Latest checks</span>
      </div>

      {activity.length === 0 ? (
        <div className="activity-empty-state" role="status">
          <span className="activity-empty-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 12h4l2.2-5 4.2 10 2.1-5H21" />
            </svg>
          </span>
          <h3>No recent checks</h3>
          <p>Monitoring activity will appear here when services are checked.</p>
        </div>
      ) : (
        <ol className="activity-list" aria-label="Recent monitoring checks">
          {activity.map((item) => (
            <ActivityItem item={item} key={item.id} />
          ))}
        </ol>
      )}
    </section>
  )
}

export function DashboardRecentActivitySkeleton() {
  return (
    <section className="dashboard-panel activity-panel" aria-labelledby="recent-activity-loading-title">
      <div className="panel-heading">
        <div>
          <h2 id="recent-activity-loading-title">Recent activity</h2>
          <p>The latest checks across your services.</p>
        </div>
      </div>
      <div
        className="activity-loading-list"
        role="status"
        aria-label="Loading recent activity"
        aria-busy="true"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <div className="activity-loading-row" key={index} aria-hidden="true">
            <span className="skeleton-bar skeleton-bar--label" />
            <span className="skeleton-bar skeleton-bar--description" />
          </div>
        ))}
      </div>
    </section>
  )
}
