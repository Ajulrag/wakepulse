import type { DashboardSummary } from '../types/dashboard'

type MetricTone = 'accent' | 'online' | 'offline' | 'disabled' | 'checks'

interface SummaryMetric {
  id: string
  label: string
  value: number
  description: string
  tone: MetricTone
}

interface DashboardSummaryCardsProps {
  summary: DashboardSummary
}

function MetricCard({ metric }: { metric: SummaryMetric }) {
  return (
    <article className={`summary-card summary-card--${metric.tone}`}>
      <div className="summary-card-heading">
        <h3 className="summary-card-label">{metric.label}</h3>
        <span className="summary-card-indicator" aria-hidden="true" />
      </div>
      <p className="summary-card-value">{metric.value.toLocaleString()}</p>
      <p className="summary-card-description">{metric.description}</p>
    </article>
  )
}

export function DashboardSummaryCards({ summary }: DashboardSummaryCardsProps) {
  const metrics: SummaryMetric[] = [
    {
      id: 'services',
      label: 'Total Services',
      value: summary.totalServices,
      description: 'Configured in this workspace',
      tone: 'accent',
    },
    {
      id: 'online',
      label: 'Online',
      value: summary.onlineServices,
      description: 'Last recorded status is online',
      tone: 'online',
    },
    {
      id: 'offline',
      label: 'Offline',
      value: summary.offlineServices,
      description: 'Last recorded status is offline',
      tone: 'offline',
    },
    {
      id: 'disabled',
      label: 'Disabled',
      value: summary.disabledServices,
      description: 'Monitoring is paused',
      tone: 'disabled',
    },
    {
      id: 'checks',
      label: 'Total Checks',
      value: summary.totalChecks,
      description: 'Recorded for this workspace',
      tone: 'checks',
    },
  ]

  return (
    <div className="summary-card-grid" role="group" aria-label="Service summary metrics">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  )
}

export function DashboardSummaryCardsSkeleton() {
  return (
    <div
      className="summary-card-grid summary-card-grid--loading"
      role="status"
      aria-label="Loading service summary"
      aria-busy="true"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div className="summary-card summary-card--skeleton" key={index} aria-hidden="true">
          <span className="skeleton-bar skeleton-bar--label" />
          <span className="skeleton-bar skeleton-bar--value" />
          <span className="skeleton-bar skeleton-bar--description" />
        </div>
      ))}
    </div>
  )
}
