import './App.css'

const dashboardSections = [
  {
    id: 'service-summary',
    title: 'Service summary',
    description: 'A snapshot of the services you monitor.',
    className: 'dashboard-panel dashboard-panel--summary',
  },
  {
    id: 'monitoring-statistics',
    title: 'Monitoring statistics',
    description: 'Availability and response time over time.',
    className: 'dashboard-panel dashboard-panel--statistics',
  },
  {
    id: 'recent-activity',
    title: 'Recent activity',
    description: 'The latest checks across your services.',
    className: 'dashboard-panel dashboard-panel--activity',
  },
  {
    id: 'upcoming-checks',
    title: 'Upcoming checks',
    description: 'See what the monitoring scheduler will check next.',
    className: 'dashboard-panel dashboard-panel--upcoming',
  },
]

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <a className="brand" href="#dashboard" aria-label="WakePulse dashboard">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path
                d="M4 17h6l3.2-8 5.1 15 3.1-7H28"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
            </svg>
          </span>
          <span className="brand-name">wakepulse</span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="primary-nav">
          <a className="nav-link nav-link--active" href="#dashboard" aria-current="page">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="5.5" height="5.5" rx="1.2" />
              <rect x="11.5" y="3" width="5.5" height="3.5" rx="1.2" />
              <rect x="11.5" y="9.5" width="5.5" height="7.5" rx="1.2" />
              <rect x="3" y="11" width="5.5" height="6" rx="1.2" />
            </svg>
            <span>Dashboard</span>
          </a>
          <button className="nav-link nav-link--placeholder" type="button" disabled>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="3" y="4" width="14" height="12" rx="2" />
              <path d="M3 8h14M7 4v4m6-4v4" />
            </svg>
            <span>Services</span>
          </button>
          <button className="nav-link nav-link--placeholder" type="button" disabled>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M2.5 10h3l2-5 4 10 2-5h4" />
              <circle cx="10" cy="10" r="8" />
            </svg>
            <span>Monitoring / History</span>
          </button>
          <button className="nav-link nav-link--placeholder" type="button" disabled>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="3" />
              <path d="m16.2 11.8 1.1.9-1.4 2.4-1.4-.5a6.7 6.7 0 0 1-1.5.9l-.3 1.5h-2.8l-.3-1.5a6.7 6.7 0 0 1-1.5-.9l-1.4.5-1.4-2.4 1.1-.9a6.4 6.4 0 0 1 0-1.8l-1.1-.9 1.4-2.4 1.4.5a6.7 6.7 0 0 1 1.5-.9l.3-1.5h2.8l.3 1.5a6.7 6.7 0 0 1 1.5.9l1.4-.5 1.4 2.4-1.1.9a6.4 6.4 0 0 1 0 1.8Z" />
            </svg>
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <span>WakePulse monitoring workspace</span>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m6 3 5 5-5 5" />
            </svg>
            <span className="breadcrumb-current">Dashboard</span>
          </div>
          <div className="topbar-note">
            Service monitoring
          </div>
        </header>

        <div className="page-content">
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

          <div className="dashboard-grid">
            {dashboardSections.map((section) => (
              <section
                className={section.className}
                id={section.id}
                key={section.id}
                aria-labelledby={`${section.id}-title`}
              >
                <div className="panel-heading">
                  <div>
                    <h2 id={`${section.id}-title`}>{section.title}</h2>
                    <p>{section.description}</p>
                  </div>
                  <span className="panel-menu" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
                <div className="panel-content" aria-hidden="true">
                  <span className="panel-placeholder-line panel-placeholder-line--long" />
                  <span className="panel-placeholder-line panel-placeholder-line--short" />
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
