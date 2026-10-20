// Theme behaviour in a real browser: Light is the default, Settings offers exactly Light and Dark,
// the choice applies everywhere at once, is remembered, and is not affected by the operating system.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const app = 'http://127.0.0.1:5180'
const KEY = 'ai-chat-theme'

const isDark = (page: Page) => page.evaluate(() => document.documentElement.classList.contains('dark'))
const stored = (page: Page) => page.evaluate((key) => localStorage.getItem(key), KEY)
const background = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor)
const signIn = async (page: Page) => {
  await page.goto(app)
  await page.getByRole('button', { name: 'Guest', exact: true }).click()
  await expect(page).toHaveURL(/\/chat$/)
}
const openSettings = async (page: Page) => {
  const menu = page.getByRole('button', { name: 'Open sidebar' })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page).toHaveURL(/\/settings$/)
}
const tile = (page: Page, label: 'Light' | 'Dark') => page.getByRole('radio', { name: `${label} theme` })
const choose = (page: Page, label: 'Light' | 'Dark') => tile(page, label).click()
const expectSelected = async (page: Page, label: 'Light' | 'Dark') => {
  const other = label === 'Light' ? 'Dark' : 'Light'
  await expect(tile(page, label)).toHaveAttribute('aria-checked', 'true')
  await expect(tile(page, other)).toHaveAttribute('aria-checked', 'false')
}

test('Settings offers exactly Light and Dark: there is no System option', async ({ page }) => {
  await signIn(page)
  await openSettings(page)
  await expect(page.getByRole('radio')).toHaveCount(2)
  await expect(page.getByRole('radio').nth(0)).toHaveAccessibleName('Light theme')
  await expect(page.getByRole('radio').nth(1)).toHaveAccessibleName('Dark theme')
  await expect(page.getByText('System', { exact: true })).toHaveCount(0)
})

test('Light is the default: the page is light and the Light tile is the selected one', async ({ page }) => {
  await signIn(page)
  expect(await isDark(page)).toBe(false)
  expect(await stored(page)).toBeNull() // nothing is saved until the user chooses
  expect(await background(page, '.chat-root')).toBe('rgb(249, 249, 247)')
  await openSettings(page)
  await expectSelected(page, 'Light')
})

test('the operating system setting does not change the default or the choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await signIn(page)
  expect(await isDark(page)).toBe(false)
  await openSettings(page)
  await expectSelected(page, 'Light')
  await choose(page, 'Dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.waitForTimeout(200)
  expect(await isDark(page)).toBe(true) // an explicit Dark stays dark whatever the OS says
  await choose(page, 'Light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForTimeout(200)
  expect(await isDark(page)).toBe(false)
})

test('clicking Dark then Light in Settings switches the whole page and selects the matching tile', async ({ page }) => {
  await signIn(page)
  await openSettings(page)
  await expectSelected(page, 'Light')
  const lightSettings = await background(page, '.settings-root')

  await choose(page, 'Dark')
  expect(await isDark(page)).toBe(true)
  await expectSelected(page, 'Dark')
  expect(await stored(page)).toBe('dark')
  expect(await background(page, '.settings-root')).not.toBe(lightSettings)
  expect(await background(page, '.settings-root')).toBe('rgb(16, 24, 21)') // #101815

  await choose(page, 'Light')
  expect(await isDark(page)).toBe(false)
  await expectSelected(page, 'Light')
  expect(await stored(page)).toBe('light')
  expect(await background(page, '.settings-root')).toBe(lightSettings)
})

test('the keyboard works on the two tiles: arrows move between Light and Dark and select', async ({ page }) => {
  await signIn(page)
  await openSettings(page)
  await tile(page, 'Light').focus()
  await page.keyboard.press('ArrowRight')
  await expectSelected(page, 'Dark')
  expect(await isDark(page)).toBe(true)
  await page.keyboard.press('ArrowRight') // wraps around
  await expectSelected(page, 'Light')
  expect(await isDark(page)).toBe(false)
  await page.keyboard.press('End')
  await expectSelected(page, 'Dark')
  await page.keyboard.press('Home')
  await expectSelected(page, 'Light')
})

test('the choice reaches every page and survives navigation, Live, reload and signing in again', async ({ page }) => {
  await signIn(page)
  await openSettings(page)
  await choose(page, 'Dark')
  await page.getByRole('button', { name: 'Back to chat' }).click()
  expect(await background(page, '.chat-root')).toBe('rgb(16, 24, 21)') // #101815
  expect(await background(page, '#chat-sidebar')).toBe('rgb(20, 31, 27)') // #141F1B
  await page.getByRole('button', { name: 'Start Live conversation' }).click()
  expect(await isDark(page)).toBe(true)
  await page.goBack()
  expect(await isDark(page)).toBe(true)

  // Reload: a Guest is back at the sign-in page, which is dark too.
  await page.reload()
  expect(await isDark(page)).toBe(true)
  await expect(page.getByRole('heading', { name: 'Welcome to AI Chat' })).toBeVisible()
  expect(await background(page, 'main section:last-child')).toBe('rgb(16, 24, 21)')
  // Signing in again: Settings shows the saved Dark choice as selected.
  await signIn(page)
  await openSettings(page)
  await expectSelected(page, 'Dark')

  // Choose Light again: the saved value changes and the sign-in page is light again.
  await choose(page, 'Light')
  await page.reload()
  expect(await isDark(page)).toBe(false)
})

test('the saved Dark choice is applied before any script runs, so the page never flashes light', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'dark'), KEY)
  // Stop the app's own script: only the inline script in index.html can have set the class.
  await page.route('**/src/main.tsx*', (route) => route.abort())
  await page.goto(app)
  expect(await isDark(page)).toBe(true)
})

test('an invalid saved value, and the removed "system" value, fall back to Light', async ({ page }) => {
  for (const value of ['purple', 'system', '']) {
    await page.goto(app)
    await page.evaluate(([key, v]) => localStorage.setItem(key, v), [KEY, value])
    await page.reload()
    expect(await isDark(page), `saved "${value}"`).toBe(false)
  }
  await page.evaluate((key) => localStorage.setItem(key, 'system'), KEY)
  await signIn(page)
  await openSettings(page)
  await expectSelected(page, 'Light')
})

test('blocked storage does not break the app; the theme still works for the visit', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('blocked')
    }
    Storage.prototype.setItem = () => {
      throw new Error('blocked')
    }
  })
  await signIn(page)
  await openSettings(page)
  await expectSelected(page, 'Light')
  await choose(page, 'Dark')
  expect(await isDark(page)).toBe(true)
  await expectSelected(page, 'Dark')
})

test('the Light and Dark thumbnails look the same in both themes', async ({ page }) => {
  await signIn(page)
  await openSettings(page)
  const thumbnails = () =>
    page.getByRole('radio').evaluateAll((tiles) =>
      tiles.map((t) => {
        const surface = t.querySelector('.theme-preview > div')!
        return getComputedStyle(surface).backgroundColor
      }),
    )
  await choose(page, 'Light')
  const inLight = await thumbnails()
  await choose(page, 'Dark')
  const inDark = await thumbnails()
  expect(inDark).toEqual(inLight)
  expect(inLight[0]).toBe('rgb(255, 255, 255)') // the Light thumbnail is a light picture
  expect(inLight[1]).toBe('rgb(32, 37, 38)') // the Dark thumbnail is a dark picture
})

test('the selected tile has the mint outline and check in Dark, and Log out stays red', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'dark'), KEY)
  await signIn(page)
  await openSettings(page)
  expect(await tile(page, 'Dark').evaluate((el) => getComputedStyle(el).borderColor)).toBe('rgb(141, 204, 179)') // #8DCCB3
  const logout = page.getByRole('button', { name: /Exit guest|Log out/ })
  const [r, g, b] = (await logout.evaluate((el) => getComputedStyle(el).color)).match(/\d+/g)!.map(Number)
  expect(r).toBeGreaterThan(g + 60)
  expect(r).toBeGreaterThan(b + 60)
})

test('Dark Theme tokens: text on the mint button is dark, primary text is light', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'dark'), KEY)
  await signIn(page)
  const newChat = page.getByRole('button', { name: 'New chat', exact: true })
  expect(await newChat.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(141, 204, 179)')
  expect(await newChat.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(16, 37, 28)') // #10251C
  expect(await page.getByRole('heading', { level: 1 }).evaluate((el) => getComputedStyle(el).color)).toBe('rgb(237, 244, 239)') // #EDF4EF
})
