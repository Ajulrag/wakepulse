import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getNotificationInbox,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications'
import type { NotificationInbox, UserNotification } from '../types/notification'
import './NotificationBell.css'

function formatNotificationTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Just now'
    : date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
}

export function NotificationBell() {
  const [inbox, setInbox] = useState<NotificationInbox>({
    notifications: [],
    unreadCount: 0,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const loadInbox = useCallback(async (signal?: AbortSignal) => {
    try {
      const nextInbox = await getNotificationInbox(signal)
      setInbox(nextInbox)
      setError('')
    } catch (requestError: unknown) {
      if (requestError instanceof Error && requestError.name === 'AbortError') {
        return
      }
      setError('Notifications could not be loaded. Please try again.')
      console.error('Unable to load WakePulse notifications:', requestError)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const initialLoad = window.setTimeout(
      () => void loadInbox(controller.signal),
      0,
    )
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadInbox()
      }
    }, 30_000)

    return () => {
      controller.abort()
      window.clearTimeout(initialLoad)
      window.clearInterval(timer)
    }
  }, [loadInbox])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const openNotifications = () => {
    setIsOpen((open) => !open)
    setError('')
    setIsLoading(true)
    void loadInbox().finally(() => setIsLoading(false))
  }

  const handleMarkRead = async (notification: UserNotification) => {
    if (notification.readAt || pendingId) {
      return
    }
    setPendingId(notification.id)
    try {
      await markNotificationRead(notification.id)
      await loadInbox()
    } catch (requestError: unknown) {
      setError('This notification could not be updated.')
      console.error('Unable to mark WakePulse notification read:', requestError)
    } finally {
      setPendingId(null)
    }
  }

  const handleMarkAllRead = async () => {
    setPendingId('all')
    try {
      await markAllNotificationsRead()
      await loadInbox()
    } catch (requestError: unknown) {
      setError('Notifications could not be updated.')
      console.error('Unable to mark all WakePulse notifications read:', requestError)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        className="notification-bell-button"
        type="button"
        onClick={openNotifications}
        aria-label={
          inbox.unreadCount > 0
            ? `Notifications, ${inbox.unreadCount} unread`
            : 'Notifications'
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M15.5 7.8a5.5 5.5 0 0 0-11 0c0 6-2 6-2 7.5h15c0-1.5-2-1.5-2-7.5ZM8 17h4" />
        </svg>
        {inbox.unreadCount > 0 && (
          <span className="notification-badge">
            {inbox.unreadCount > 99 ? '99+' : inbox.unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          className="notification-panel"
          role="dialog"
          aria-label="Notifications"
        >
          <header className="notification-panel-header">
            <div>
              <h2>Notifications</h2>
              <p>
                {inbox.unreadCount > 0
                  ? `${inbox.unreadCount} unread`
                  : 'You’re all caught up'}
              </p>
            </div>
            <div className="notification-panel-actions">
              <button
                type="button"
                className="notification-icon-action"
                aria-label="Refresh notifications"
                onClick={() => {
                  setIsLoading(true)
                  void loadInbox().finally(() => setIsLoading(false))
                }}
              >
                ↻
              </button>
              {inbox.unreadCount > 0 && (
                <button
                  type="button"
                  className="notification-mark-all"
                  disabled={pendingId !== null}
                  onClick={() => void handleMarkAllRead()}
                >
                  Mark all read
                </button>
              )}
            </div>
          </header>

          {error && <p className="notification-error" role="alert">{error}</p>}
          {isLoading && <p className="notification-empty" role="status">Loading…</p>}
          {!isLoading && inbox.notifications.length === 0 && !error && (
            <p className="notification-empty">Service alerts will appear here.</p>
          )}
          {!isLoading && inbox.notifications.length > 0 && (
            <ul className="notification-list">
              {inbox.notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={
                    notification.readAt
                      ? 'notification-item'
                      : 'notification-item notification-item--unread'
                  }
                >
                  <Link
                    to={`/services/${encodeURIComponent(notification.serviceId)}`}
                    className="notification-item-link"
                    onClick={() => {
                      void handleMarkRead(notification)
                      setIsOpen(false)
                    }}
                  >
                    <span
                      className={`notification-event-dot notification-event-dot--${notification.event}`}
                      aria-hidden="true"
                    />
                    <span className="notification-item-copy">
                      <strong>{notification.message}</strong>
                      {notification.error && <small>{notification.error}</small>}
                      <time dateTime={notification.createdAt}>
                        {formatNotificationTime(notification.createdAt)}
                      </time>
                    </span>
                    {!notification.readAt && (
                      <span className="notification-unread-dot" aria-label="Unread" />
                    )}
                  </Link>
                  {!notification.readAt && (
                    <button
                      type="button"
                      className="notification-mark-one"
                      disabled={pendingId !== null}
                      onClick={() => void handleMarkRead(notification)}
                    >
                      Mark read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <footer className="notification-panel-footer">
            Refreshes automatically every 30 seconds.
          </footer>
        </section>
      )}
    </div>
  )
}
