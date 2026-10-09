import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import '../App.css'

interface AppLayoutProps {
  activePage: 'dashboard' | 'services' | 'history' | 'settings'
  children: ReactNode
}

export function AppLayout({ activePage, children }: AppLayoutProps) {
  const { state: authState, logout } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const logoutSubmissionLock = useRef(false)
  const accountName =
    authState.status === 'authenticated' ? authState.user.name : ''

  const currentPageLabel =
    activePage === 'dashboard'
      ? 'Dashboard'
      : activePage === 'services'
        ? 'Services'
        : activePage === 'history'
          ? 'Monitoring / History'
          : 'Settings'

  const handleLogout = async () => {
    if (logoutSubmissionLock.current) {
      return
    }

    logoutSubmissionLock.current = true
    setIsLoggingOut(true)

    try {
      await logout()
    } catch {
      // AuthContext clears the local auth state even when the request fails.
    } finally {
      logoutSubmissionLock.current = false
      setIsLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <Link className="brand" to="/dashboard" aria-label="WakePulse dashboard">
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
        </Link>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Workspace">
          <Link
            className={`nav-link${activePage === 'dashboard' ? ' nav-link--active' : ''}`}
            to="/dashboard"
            aria-current={activePage === 'dashboard' ? 'page' : undefined}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="5.5" height="5.5" rx="1.2" />
              <rect x="11.5" y="3" width="5.5" height="3.5" rx="1.2" />
              <rect x="11.5" y="9.5" width="5.5" height="7.5" rx="1.2" />
              <rect x="3" y="11" width="5.5" height="6" rx="1.2" />
            </svg>
            <span>Dashboard</span>
          </Link>
          <Link
            className={`nav-link${activePage === 'services' ? ' nav-link--active' : ''}`}
            to="/services"
            aria-current={activePage === 'services' ? 'page' : undefined}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="3" y="4" width="14" height="12" rx="2" />
              <path d="M3 8h14M7 4v4m6-4v4" />
            </svg>
            <span>Services</span>
          </Link>
          <Link
            className={`nav-link${activePage === 'history' ? ' nav-link--active' : ''}`}
            to="/history"
            aria-current={activePage === 'history' ? 'page' : undefined}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M2.5 10h3l2-5 4 10 2-5h4" />
              <circle cx="10" cy="10" r="8" />
            </svg>
            <span>Monitoring / History</span>
          </Link>
          <Link
            className={`nav-link${activePage === 'settings' ? ' nav-link--active' : ''}`}
            to="/settings"
            aria-current={activePage === 'settings' ? 'page' : undefined}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="3" />
              <path d="m16.2 11.8 1.1.9-1.4 2.4-1.4-.5a6.7 6.7 0 0 1-1.5.9l-.3 1.5h-2.8l-.3-1.5a6.7 6.7 0 0 1-1.5-.9l-1.4.5-1.4-2.4 1.1-.9a6.4 6.4 0 0 1 0-1.8l-1.1-.9 1.4-2.4 1.4.5a6.7 6.7 0 0 1 1.5-.9l.3-1.5h2.8l.3 1.5a6.7 6.7 0 0 1 1.5.9l1.4-.5 1.4 2.4-1.1.9a6.4 6.4 0 0 1 0 1.8Z" />
            </svg>
            <span>Settings</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <span>WakePulse monitoring workspace</span>
        </div>
      </aside>

      <main className="main-content" id={activePage}>
        <header className="topbar">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span>Workspace</span>
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m6 3 5 5-5 5" />
            </svg>
            <span className="breadcrumb-current">{currentPageLabel}</span>
          </nav>
          <div className="topbar-actions">
            {accountName && <span className="topbar-user">{accountName}</span>}
            <button
              className="logout-button"
              type="button"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              aria-busy={isLoggingOut}
            >
              {isLoggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
