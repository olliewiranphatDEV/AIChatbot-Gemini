import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyTheme, DEFAULT_THEME_PREFERENCE, isThemePreference, readStoredPreference, storePreference, THEME_STORAGE_KEY } from '../../src/theme/theme.ts'

const storageWith = (value: string | null) => ({ getItem: (key: string) => (key === THEME_STORAGE_KEY ? value : null) })

test('Light is the default theme', () => {
  assert.equal(DEFAULT_THEME_PREFERENCE, 'light')
  assert.equal(readStoredPreference(storageWith(null)), 'light')
})

test('a stored Light or Dark choice is read back', () => {
  assert.equal(readStoredPreference(storageWith('light')), 'light')
  assert.equal(readStoredPreference(storageWith('dark')), 'dark')
})

test('something invalid, including the removed "system" value, gives Light instead of an error', () => {
  for (const bad of ['', 'DARK', 'blue', 'system', '{"theme":"dark"}', 'undefined']) assert.equal(readStoredPreference(storageWith(bad)), 'light')
  assert.equal(readStoredPreference(undefined), 'light')
})

test('unavailable storage (it throws) never breaks reading or writing', () => {
  const broken = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
  }
  assert.equal(readStoredPreference(broken), 'light')
  assert.doesNotThrow(() => storePreference(broken, 'dark'))
  assert.doesNotThrow(() => storePreference(undefined, 'dark'))
})

test('the choice is stored under one key, as given', () => {
  const written: [string, string][] = []
  storePreference({ setItem: (key, value) => written.push([key, value]) }, 'dark')
  storePreference({ setItem: (key, value) => written.push([key, value]) }, 'light')
  assert.deepEqual(written, [[THEME_STORAGE_KEY, 'dark'], [THEME_STORAGE_KEY, 'light']])
})

test('applying a theme sets or clears the dark class', () => {
  const classes = new Set<string>()
  const root = {
    classList: {
      toggle: (token: string, force?: boolean) => {
        if (force) classes.add(token)
        else classes.delete(token)
        return classes.has(token)
      },
    },
  }
  applyTheme(root, 'dark')
  assert.ok(classes.has('dark'))
  applyTheme(root, 'light')
  assert.ok(!classes.has('dark'))
})

test('only Light and Dark are accepted as preferences', () => {
  assert.ok(isThemePreference('light'))
  assert.ok(isThemePreference('dark'))
  assert.ok(!isThemePreference('system'))
  assert.ok(!isThemePreference(undefined))
})
