export type MonitoringWindow = '24h' | '7d' | '30d'

export interface WorkspacePreferences {
  defaultWindow: MonitoringWindow
  autoRefresh: boolean
  compactCards: boolean
}

const STORAGE_KEY = 'wakepulse-settings'

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  defaultWindow: '7d',
  autoRefresh: true,
  compactCards: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMonitoringWindow(value: unknown): value is MonitoringWindow {
  return value === '24h' || value === '7d' || value === '30d'
}

export function loadWorkspacePreferences(): WorkspacePreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_WORKSPACE_PREFERENCES
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return DEFAULT_WORKSPACE_PREFERENCES
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) {
      return DEFAULT_WORKSPACE_PREFERENCES
    }

    return {
      defaultWindow: isMonitoringWindow(parsed.defaultWindow)
        ? parsed.defaultWindow
        : DEFAULT_WORKSPACE_PREFERENCES.defaultWindow,
      autoRefresh: typeof parsed.autoRefresh === 'boolean'
        ? parsed.autoRefresh
        : DEFAULT_WORKSPACE_PREFERENCES.autoRefresh,
      compactCards: typeof parsed.compactCards === 'boolean'
        ? parsed.compactCards
        : DEFAULT_WORKSPACE_PREFERENCES.compactCards,
    }
  } catch {
    return DEFAULT_WORKSPACE_PREFERENCES
  }
}

export function saveWorkspacePreferences(
  preferences: WorkspacePreferences,
): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}
