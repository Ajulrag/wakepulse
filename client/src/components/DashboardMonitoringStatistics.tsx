import type { DashboardStats } from '../types/dashboard'

type StatisticTone = 'checks' | 'successful' | 'failed' | 'uptime' | 'response'

interface MonitoringStatistic {
  id: string
  label: string
  value: string
  description: string
  tone: StatisticTone
}

interface DashboardMonitoringStatisticsProps {
  stats: DashboardStats
}

function StatisticCard({ statistic }: { statistic: MonitoringStatistic }) {
  return (
    <article className={`statistics-card statistics-card--${statistic.tone}`}>
      <div className="statistics-card-heading">
        <h3>{statistic.label}</h3>
        <span className="statistics-card-indicator" aria-hidden="true" />
      </div>
      <p className="statistics-card-value">{statistic.value}</p>
      <p className="statistics-card-description">{statistic.description}</p>
    </article>
  )
}

export function DashboardMonitoringStatistics({
  stats,
}: DashboardMonitoringStatisticsProps) {
  const hasChecks = stats.checks24h > 0
  const uptimeValue = hasChecks
    ? `${stats.uptime24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
    : '—'
  const averageResponseTimeValue =
    stats.averageResponseTime24h === null
      ? '—'
      : `${stats.averageResponseTime24h.toLocaleString()} ms`

  const statistics: MonitoringStatistic[] = [
    {
      id: 'checks',
      label: 'Checks in 24 hours',
      value: stats.checks24h.toLocaleString(),
      description: 'Checks recorded in the last 24 hours',
      tone: 'checks',
    },
    {
      id: 'successful',
      label: 'Successful checks',
      value: stats.successfulChecks24h.toLocaleString(),
      description: 'Checks that received a successful response',
      tone: 'successful',
    },
    {
      id: 'failed',
      label: 'Failed checks',
      value: stats.failedChecks24h.toLocaleString(),
      description: 'Checks that did not receive a successful response',
      tone: 'failed',
    },
    {
      id: 'uptime',
      label: 'Uptime',
      value: uptimeValue,
      description: hasChecks
        ? 'Based on checks in the last 24 hours'
        : 'No checks recorded in the last 24 hours',
      tone: 'uptime',
    },
    {
      id: 'response',
      label: 'Average response time',
      value: averageResponseTimeValue,
      description:
        stats.averageResponseTime24h === null
          ? 'No response times recorded in the last 24 hours'
          : 'Across checks in the last 24 hours',
      tone: 'response',
    },
  ]

  return (
    <section className="statistics-section" aria-labelledby="statistics-title">
      <div className="summary-section-heading">
        <div>
          <h2 id="statistics-title">Monitoring statistics</h2>
          <p>Checks and availability over the last 24 hours.</p>
        </div>
      </div>
      <div className="statistics-card-grid" role="group" aria-label="24-hour monitoring statistics">
        {statistics.map((statistic) => (
          <StatisticCard key={statistic.id} statistic={statistic} />
        ))}
      </div>
    </section>
  )
}

export function DashboardMonitoringStatisticsSkeleton() {
  return (
    <section className="statistics-section" aria-labelledby="statistics-loading-title">
      <div className="summary-section-heading">
        <div>
          <h2 id="statistics-loading-title">Monitoring statistics</h2>
          <p>Checks and availability over the last 24 hours.</p>
        </div>
      </div>
      <div
        className="statistics-card-grid statistics-card-grid--loading"
        role="status"
        aria-label="Loading monitoring statistics"
        aria-busy="true"
      >
        {Array.from({ length: 5 }, (_, index) => (
          <div className="statistics-card statistics-card--skeleton" key={index} aria-hidden="true">
            <span className="skeleton-bar skeleton-bar--label" />
            <span className="skeleton-bar skeleton-bar--value" />
            <span className="skeleton-bar skeleton-bar--description" />
          </div>
        ))}
      </div>
    </section>
  )
}
