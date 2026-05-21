'use client'

import * as React from 'react'
 
type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

export interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: ThemeMode
  storageKey?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  attribute?: 'class'
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: ThemeMode, enableSystem: boolean) {
  if (typeof document === 'undefined') return getSystemTheme()
  const root = document.documentElement
  const resolved = theme === 'system' && enableSystem ? getSystemTheme() : (theme as 'light' | 'dark')
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  return resolved
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<ThemeMode>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>('dark')

  React.useEffect(() => {
    const stored = window.localStorage.getItem(storageKey) as ThemeMode | null
    const initialTheme = stored ?? defaultTheme
    setThemeState(initialTheme)
    setResolvedTheme(applyTheme(initialTheme, enableSystem))
  }, [defaultTheme, enableSystem, storageKey])

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      if (theme === 'system' && enableSystem) {
        setResolvedTheme(applyTheme('system', true))
      }
    }
    media.addEventListener('change', handleSystemThemeChange)
    return () => media.removeEventListener('change', handleSystemThemeChange)
  }, [theme, enableSystem])

  const setTheme = React.useCallback(
    (nextTheme: ThemeMode) => {
      if (disableTransitionOnChange) {
        const style = document.createElement('style')
        style.appendChild(document.createTextNode('* { transition: none !important; }'))
        document.head.appendChild(style)
        // Force style flush before removing at the next tick.
        void window.getComputedStyle(document.body)
        setTimeout(() => document.head.removeChild(style), 0)
      }

      window.localStorage.setItem(storageKey, nextTheme)
      setThemeState(nextTheme)
      setResolvedTheme(applyTheme(nextTheme, enableSystem))
    },
    [disableTransitionOnChange, enableSystem, storageKey],
  )

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
