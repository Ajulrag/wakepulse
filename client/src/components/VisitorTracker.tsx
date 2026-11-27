import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../api/admin'

function getVisitorId(): string {
  try {
    const storedId = window.sessionStorage.getItem('wakepulse-visitor-id')
    if (storedId) {
      return storedId
    }

    const visitorId = window.crypto.randomUUID()
    window.sessionStorage.setItem('wakepulse-visitor-id', visitorId)
    return visitorId
  } catch {
    return window.crypto.randomUUID()
  }
}

export function VisitorTracker() {
  const { pathname } = useLocation()
  const previousPath = useRef<string | null>(null)
  const visitorId = useRef<string | null>(null)

  useEffect(() => {
    if (
      previousPath.current === pathname ||
      pathname.startsWith('/admin') ||
      window.navigator.doNotTrack === '1'
    ) {
      return
    }

    previousPath.current = pathname
    visitorId.current ??= getVisitorId()
    const normalizedPath = pathname.replace(
      /^\/services\/[^/]+$/,
      '/services/:serviceId',
    )

    void trackPageView(visitorId.current, normalizedPath).catch((error: unknown) => {
      console.error('Unable to record WakePulse page view:', error)
    })
  }, [pathname])

  return null
}
