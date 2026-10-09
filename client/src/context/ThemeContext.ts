import { createContext } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

export const STORAGE_KEY = 'wakepulse-theme'
export const ThemeContext = createContext<ThemeContextValue | null>(null)
