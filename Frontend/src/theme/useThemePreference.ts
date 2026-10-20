import { useCallback, useEffect, useState } from 'react'
import { applyTheme, isThemePreference, readStoredPreference, storePreference, THEME_STORAGE_KEY } from './theme.ts'
import type { ThemePreference } from './theme.ts'

const browserStorage = () => {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

/**
 * The user's theme choice (Light or Dark) for the whole app. It is applied to <html> (so every
 * page, route change and sign-in/sign-out share it) and remembered on this device.
 */
export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>(() => readStoredPreference(browserStorage()))

  useEffect(() => {
    applyTheme(document.documentElement, preference)
  }, [preference])

  // Another tab changed the choice.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && isThemePreference(event.newValue)) setPreference(event.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const choose = useCallback((next: ThemePreference) => {
    storePreference(browserStorage(), next)
    setPreference(next)
  }, [])

  return { preference, choose }
}
