import { useState } from 'react'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../context/useAuth'
import {
  loadWorkspacePreferences,
  saveWorkspacePreferences,
} from '../preferences'

export function SettingsPage() {
  const { state } = useAuth()
  const [settings, setSettings] = useState(loadWorkspacePreferences)
  const [persistenceError, setPersistenceError] = useState<string | null>(null)

  const account = state.status === 'authenticated' ? state.user : null
  const updateSettings = (
    update: Partial<typeof settings>,
  ) => {
    const updatedSettings = { ...settings, ...update }
    setSettings(updatedSettings)

    try {
      saveWorkspacePreferences(updatedSettings)
      setPersistenceError(null)
    } catch {
      setPersistenceError(
        'WakePulse could not save this preference in your browser. The current selection will remain active until you leave this page.',
      )
    }
  }

  return (
    <AppLayout activePage="settings">
      <div className="page-content">
        <section className="page-heading" aria-labelledby="settings-title">
          <div>
            <p className="eyebrow">WORKSPACE SETTINGS</p>
            <h1 id="settings-title">Preferences</h1>
            <p className="page-description">
              Configure how WakePulse presents monitoring data. Preferences are
              stored in this browser.
            </p>
          </div>
        </section>

        {persistenceError && (
          <p className="settings-save-error" role="alert">
            {persistenceError}
          </p>
        )}

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
                const value = event.target.value
                if (value === '24h' || value === '7d' || value === '30d') {
                  updateSettings({ defaultWindow: value })
                }
              }}
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          <div className="settings-toggle-row">
            <div>
              <strong id="auto-refresh-label">Auto-refresh dashboard</strong>
              <p>Update service status cards automatically while the page stays open.</p>
            </div>
            <label className="settings-switch">
              <input
                id="auto-refresh"
                type="checkbox"
                checked={settings.autoRefresh}
                aria-labelledby="auto-refresh-label"
                onChange={(event) => updateSettings({ autoRefresh: event.target.checked })}
              />
              <span className="settings-slider" aria-hidden="true" />
            </label>
          </div>

          <div className="settings-toggle-row">
            <div>
              <strong id="compact-cards-label">Compact cards</strong>
              <p>Reduce card padding for a denser dashboard overview.</p>
            </div>
            <label className="settings-switch">
              <input
                id="compact-cards"
                type="checkbox"
                checked={settings.compactCards}
                aria-labelledby="compact-cards-label"
                onChange={(event) => updateSettings({ compactCards: event.target.checked })}
              />
              <span className="settings-slider" aria-hidden="true" />
            </label>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
