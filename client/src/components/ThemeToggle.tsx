import { useTheme } from '../context/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'light' ? 'dark' : 'light'

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={theme === 'dark'}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="3.5" />
          <path d="M10 2v1.5m0 13V18m8-8h-1.5m-13 0H2m13.66-5.66-1.06 1.06m-9.2 9.2-1.06 1.06m11.32 0-1.06-1.06m-9.2-9.2L4.34 4.34" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M16.2 12.1A7 7 0 0 1 7.9 3.8a7 7 0 1 0 8.3 8.3Z" />
        </svg>
      )}
      <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}
