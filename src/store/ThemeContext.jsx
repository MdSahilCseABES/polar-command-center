/**
 * THEME CONTEXT — dark/light mode switch.
 *
 * Stores the chosen theme in localStorage so it survives a refresh.
 * Applies the theme by setting `data-theme` on the root <html> element,
 * which flips every CSS variable in index.css at once.
 *
 * Default: follows the system preference (prefers-color-scheme), then
 * whatever the user last picked.
 */

import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'polar-theme'

/** Read the user's OS-level preference. */
function systemPreference() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Read stored preference, defaulting to 'cyan' (Arctic Cyan Dark). */
function storedOrSystem() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'cyan' || stored === 'black' || stored === 'light') return stored
    if (stored === 'dark') return 'cyan'
  } catch {
    /* localStorage may throw in private browsing on some browsers. */
  }
  return 'cyan'
}

const ThemeContext = createContext({
  theme: 'cyan',
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: true,
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(storedOrSystem)

  /* Apply the attribute that flips the CSS variables. */
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)

    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* Silently ignore storage errors. */
    }
  }, [theme])

  /* Listen for OS preference changes while the app is open if no custom choice saved. */
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'cyan' : 'light')
      }
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  /* 3-way cycling: cyan -> black -> light -> cyan */
  const toggleTheme = () => {
    setTheme((t) => {
      if (t === 'cyan' || t === 'dark') return 'black'
      if (t === 'black') return 'light'
      return 'cyan'
    })
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme !== 'light',
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
