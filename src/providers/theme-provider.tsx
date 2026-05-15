'use client'
import * as React from 'react'

export type ThemeName =
  | 'snow'       // Light: pure white + blue
  | 'lavender'   // Light: pastel purple
  | 'parchment'  // Light: warm cream/sand
  | 'midnight'   // Dark: deep navy blue
  | 'obsidian'   // Dark: pure near-black
  | 'graphite'   // Dark: cool dark grey

export const THEMES: { name: ThemeName; label: string; isDark: boolean; preview: string[] }[] = [
  { name: 'snow',      label: 'Snow',      isDark: false, preview: ['#ffffff', '#dbeafe', '#2563eb'] },
  { name: 'lavender',  label: 'Lavender',  isDark: false, preview: ['#f5f3ff', '#e9d5ff', '#7c3aed'] },
  { name: 'parchment', label: 'Parchment', isDark: false, preview: ['#fdf8f0', '#fde68a', '#b45309'] },
  { name: 'midnight',  label: 'Midnight',  isDark: true,  preview: ['#0f172a', '#1e3a5f', '#60a5fa'] },
  { name: 'obsidian',  label: 'Obsidian',  isDark: true,  preview: ['#09090b', '#18181b', '#e4e4e7'] },
  { name: 'graphite',  label: 'Graphite',  isDark: true,  preview: ['#1c1c1e', '#2c2c2e', '#a1a1aa'] },
]

interface ThemeContextValue {
  theme: ThemeName
  setTheme: (t: ThemeName) => void
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: 'snow',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeName>('snow')

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('phorzen-theme') as ThemeName | null
      const valid = THEMES.find(t => t.name === stored)
      const resolved: ThemeName = valid ? stored! : 'snow'
      setThemeState(resolved)
      applyTheme(resolved)
    } catch {}
  }, [])

  const setTheme = React.useCallback((t: ThemeName) => {
    setThemeState(t)
    applyTheme(t)
    try { localStorage.setItem('phorzen-theme', t) } catch {}
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

function applyTheme(theme: ThemeName) {
  const root = document.documentElement
  // Remove all theme classes
  THEMES.forEach(t => root.classList.remove(t.name))
  // Add current theme class
  root.classList.add(theme)
  // Also add/remove 'dark' for Tailwind dark: utilities
  const isDark = THEMES.find(t => t.name === theme)?.isDark ?? false
  if (isDark) root.classList.add('dark')
  else root.classList.remove('dark')
}

export function useTheme() {
  return React.useContext(ThemeContext)
}
