import { useEffect, useState, type ReactNode } from 'react'
import { STORAGE_KEY, ThemeContext, type Theme } from './ThemeContext'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme

    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // The selected theme still applies for this session when storage is unavailable.
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
