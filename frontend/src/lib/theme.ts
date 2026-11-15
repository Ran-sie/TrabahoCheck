import { useState } from 'react'

/** Light/dark theme. The first value is set before paint by a script in index.html. */
export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggle() {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // Storage can be blocked (private mode); the theme still changes for this visit.
    }
    setDark(next)
  }

  return { dark, toggle }
}
