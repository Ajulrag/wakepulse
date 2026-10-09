import { useEffect, useState } from 'react'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../context/useAuth'

const STORAGE_KEY = 'wakepulse-settings'

type WindowPreset = '24h' | '7d' | '30d'

interface UserSettings {
  defaultWindow: WindowPreset
  autoRefresh: boolean
  compactCards: boolean
}

const defaultSettings: UserSettings = {
  defaultWindow: '7d',
  autoRefresh: true,
  compactCards: false,
}

function loadSettings(): UserSettings {
  if (typeof window === 'undefined') {
    return defaultSettings
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return defaultSettings
    }

    const parsed = JSON.parse(raw) as Partial<UserSettings>
    const safeWindow = parsed.defaultWindow === '24h' || parsed.defaultWindow === '7d' || parsed.defaultWindow === '30d'
      ? parsed.defaultWindow
      : defaultSettings.defaultWindow

    return {
      defaultWindow: safeWindow,
      autoRefresh: parsed.autoRefresh !== false,
      compactCards: Boolean(parsed.compactCards),
    }
  } catch {
    return defaultSettings
  }
}

export function SettingsPage() {
  const { state } = useAuth()
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const account = state.status === 'authenticated' ? state.user : null

  return (
    <AppLayout activePage="settings">
      <div className="page-content">
        <section className="page-heading" aria-labelledby="settings-title">
          <div>
            <p className="eyebrow">WORKSPACE SETTINGS</p>
            <h1 id="settings-title">Preferences</h1>
            <p className="page-description">
              Configure how WakePulse presents your monitoring dashboard and refresh data.
            </p>
          </div>
        </section>

        <section className="dashboard-panel settings-panel" aria-labelledby="settings-account-heading">
          <div className="summary-section-heading">
            <div>
              <h2 id="settings-account-heading">Account</h2>
              <p>Your current signed-in profile.</p>
            </div>
          </div>

          <div className="settings-account-card">
            <div>
              <span className="settings-label">Name</span>
              <strong>{account?.name ?? 'Unavailable'}</strong>
            </div>
            <div>
              <span className="settings-label">Email</span>
              <strong>{account?.email ?? 'Unavailable'}</strong>
            </div>
            <div>
              <span className="settings-label">Role</span>
              <strong>{account?.role ?? 'user'}</strong>
            </div>
          </div>
        </section>

        <section className="dashboard-panel settings-panel" aria-labelledby="settings-monitoring-heading">
          <div className="summary-section-heading">
            <div>
              <h2 id="settings-monitoring-heading">Monitoring</h2>
              <p>Default behavior across the monitoring workspace.</p>
            </div>
          </div>

          <div className="settings-field-group">
            <label className="settings-field-label" htmlFor="default-window">
              Default summary window
            </label>
            <select
              id="default-window"
              value={settings.defaultWindow}
              onChange={(event) => {
                const value = event.target.value as WindowPreset
                setSettings((current) => ({ ...current, defaultWindow: value }))
              }}
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          <div className="settings-toggle-row">
            <div>
              <strong>Auto-refresh dashboard</strong>
              <p>Update service status cards automatically while the page stays open.</p>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={settings.autoRefresh}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    autoRefresh: event.target.checked,
                  }))
                }
              />
              <span className="settings-slider" aria-hidden="true" />
            </label>
          </div>

          <div className="settings-toggle-row">
            <div>
              <strong>Compact cards</strong>
              <p>Reduce card padding for a denser dashboard overview.</p>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={settings.compactCards}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    compactCards: event.target.checked,
                  }))
                }
              />
              <span className="settings-slider" aria-hidden="true" />
            </label>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
