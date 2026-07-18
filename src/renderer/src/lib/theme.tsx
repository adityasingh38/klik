import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { klikApi } from '../api/klikApi'
import { DEFAULT_PREFERENCES, type Preferences, type ThemePreference } from '../../../shared/prefs'

interface ThemeContextValue {
  /** What the user chose, including `system`. */
  preference: ThemePreference
  /** What that resolves to right now. */
  resolved: 'light' | 'dark'
  sound: boolean
  setTheme: (next: ThemePreference, origin?: { x: number; y: number }) => void
  setSound: (next: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(preference: ThemePreference): 'light' | 'dark' {
  return preference === 'system' ? systemTheme() : preference
}

/**
 * Applies the theme by stamping `data-theme` on the document element, which the token
 * layer keys off. `system` clears the attribute so the OS media query takes over again
 * rather than being frozen at whatever it resolved to at the time.
 */
function apply(preference: ThemePreference): void {
  const root = document.documentElement
  if (preference === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', preference)
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => systemTheme())

  // Preferences live in the main process, so the first paint uses the default and is
  // corrected as soon as they load. Reading them is a single file read — fast enough
  // that this doesn't flash in practice.
  useEffect(() => {
    let cancelled = false
    klikApi
      .getPrefs()
      .then((loaded) => {
        if (cancelled) return
        setPrefs(loaded)
        apply(loaded.theme)
        setResolved(resolve(loaded.theme))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Track the OS while the preference is `system`.
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => {
      if (prefs.theme === 'system') setResolved(systemTheme())
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [prefs.theme])

  const setTheme = useCallback(
    (next: ThemePreference, origin?: { x: number; y: number }): void => {
      const commit = (): void => {
        apply(next)
        setResolved(resolve(next))
      }

      setPrefs((p) => ({ ...p, theme: next }))
      void klikApi.setPrefs({ theme: next }).catch(() => {})

      // The switch is a moment, not a repaint: the new theme wipes in as a circle
      // from wherever the user clicked. Falls back to an instant swap where View
      // Transitions aren't available or motion is unwelcome.
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const startViewTransition = (
        document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
      ).startViewTransition

      if (!origin || prefersReduced || typeof startViewTransition !== 'function') {
        commit()
        return
      }

      const transition = startViewTransition.call(document, commit)
      const radius = Math.hypot(
        Math.max(origin.x, window.innerWidth - origin.x),
        Math.max(origin.y, window.innerHeight - origin.y)
      )
      void transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${origin.x}px ${origin.y}px)`,
              `circle(${radius}px at ${origin.x}px ${origin.y}px)`
            ]
          },
          {
            duration: 480,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            pseudoElement: '::view-transition-new(root)'
          }
        )
      })
    },
    []
  )

  const setSound = useCallback((next: boolean): void => {
    setPrefs((p) => ({ ...p, sound: next }))
    void klikApi.setPrefs({ sound: next }).catch(() => {})
  }, [])

  return (
    <ThemeContext.Provider
      value={{ preference: prefs.theme, resolved, sound: prefs.sound, setTheme, setSound }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
