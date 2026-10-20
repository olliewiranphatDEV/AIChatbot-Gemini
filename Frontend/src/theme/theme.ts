// Theme preference logic. Pure (storage and the document are passed in), so it is unit-tested.
// index.html carries a tiny copy of the "is it dark?" check that runs before the first paint.

export type ThemePreference = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'ai-chat-theme'
/** What a first-time visitor gets (and anyone whose saved value is missing or no longer valid). */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'light'

export const isThemePreference = (value: unknown): value is ThemePreference => value === 'light' || value === 'dark'

/** The stored choice, or Light when nothing valid is stored (an old "system" value included) or storage is unavailable. */
export function readStoredPreference(storage: Pick<Storage, 'getItem'> | undefined): ThemePreference {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY)
    return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE
  } catch {
    return DEFAULT_THEME_PREFERENCE
  }
}

/** Remember the choice on this device. Failing (private mode, blocked storage) only means it is not remembered. */
export function storePreference(storage: Pick<Storage, 'setItem'> | undefined, preference: ThemePreference): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Not remembered; the theme still applies for this visit.
  }
}

/** Switch the page: the `dark` class on <html> selects the Dark Theme tokens (see index.css). */
export function applyTheme(root: { classList: { toggle(token: string, force?: boolean): boolean } }, preference: ThemePreference): void {
  root.classList.toggle('dark', preference === 'dark')
}
