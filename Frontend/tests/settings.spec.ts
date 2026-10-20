// The Settings page, feature by feature, in a real browser (real clicks and keys).
// Guest runs against the no-Firebase server; Google sign-in uses the Firebase Auth emulator.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const guestApp = 'http://127.0.0.1:5180'
const emulatorApp = 'http://127.0.0.1:5181'
const API = 'http://127.0.0.1:3999'
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }

async function mockChat(page: Page) {
  await page.route(`${API}/**`, (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    return route.fulfill({ status: 200, headers: cors, json: { reply: 'A reply' } })
  })
}
const guest = async (page: Page) => {
  await mockChat(page)
  await page.goto(guestApp)
  await page.getByRole('button', { name: 'Guest', exact: true }).click()
  await expect(page).toHaveURL(/\/chat$/)
}
const openSidebar = async (page: Page) => {
  const menu = page.getByRole('button', { name: 'Open sidebar' })
  if (await menu.isVisible()) await menu.click()
}
const openSettings = async (page: Page) => {
  await openSidebar(page)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page).toHaveURL(/\/settings$/)
}
const send = async (page: Page, text: string) => {
  await page.getByRole('textbox', { name: 'Message AI Chat' }).fill(text)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByRole('log').getByText(text, { exact: true })).toBeVisible()
}
const account = (page: Page) => page.locator('#account-heading + .settings-card')

test('Settings opens from the sidebar and shows its sections; the sidebar marks it as current', async ({ page }) => {
  await guest(page)
  await openSettings(page)
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  await expect(page.getByText('Make AI Chat feel like your space.')).toBeVisible()
  for (const section of ['Account', 'Appearance', 'Session']) await expect(page.getByRole('heading', { name: section, level: 2 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('textbox', { name: 'Message AI Chat' })).toBeHidden() // the chat is behind it, not shown
})

test('Account (Guest): name, temporary session, Guest badge, no Google badge and no e-mail', async ({ page }) => {
  await guest(page)
  await openSettings(page)
  await expect(account(page)).toContainText('Guest')
  await expect(account(page)).toContainText('Temporary session')
  await expect(account(page).getByText('Guest session', { exact: true })).toBeVisible()
  await expect(page.getByText('Google account', { exact: true })).toHaveCount(0)
  await expect(account(page).getByText('G', { exact: true })).toBeVisible() // avatar initial
})

test('Session (Guest): says history is not saved and offers Exit guest', async ({ page }) => {
  await guest(page)
  await openSettings(page)
  await expect(page.getByText('Chat history is not saved.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Exit guest', exact: true })).toBeEnabled()
})

test('Back to chat returns to the same conversation and keeps the unsent draft; browser Back and Forward agree', async ({ page }) => {
  await guest(page)
  await send(page, 'My question')
  await page.getByRole('textbox', { name: 'Message AI Chat' }).fill('half written')
  await openSettings(page)
  await page.getByRole('button', { name: 'Back to chat' }).click()
  await expect(page).toHaveURL(/\/chat$/)
  await expect(page.getByRole('log')).toContainText('My question')
  await expect(page.getByRole('textbox', { name: 'Message AI Chat' })).toHaveValue('half written')

  await page.goBack()
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL(/\/chat$/)
  await expect(page.getByRole('log')).toContainText('My question')
})

test('the sidebar still works from Settings: New chat opens an empty chat', async ({ page }) => {
  await guest(page)
  await send(page, 'Old message')
  await openSettings(page)
  await openSidebar(page)
  await page.getByRole('button', { name: 'New chat', exact: true }).click()
  await expect(page).toHaveURL(/\/chat$/)
  await expect(page.getByRole('log')).toBeEmpty()
  await expect(page.getByRole('textbox', { name: 'Message AI Chat' })).toBeVisible()
})

test('Exit guest ends the session, discards the chat, and Settings is no longer reachable', async ({ page }) => {
  await guest(page)
  await send(page, 'Temporary words')
  await openSettings(page)
  await page.getByRole('button', { name: 'Exit guest', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  // Asking for Settings while signed out goes to the sign-in page.
  await page.evaluate(() => {
    window.history.pushState(null, '', '/settings')
    window.dispatchEvent(new Event('app:navigation'))
  })
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('button', { name: 'Guest', exact: true }).click()
  await expect(page.getByRole('log')).toBeEmpty() // a new Guest starts with nothing
})

test('keyboard: the page is reachable by Tab in order, with a visible focus ring, and the theme tiles use one tab stop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await guest(page)
  await openSettings(page)
  await page.getByRole('button', { name: 'Open sidebar' }).focus()
  const order: string[] = []
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('Tab')
    order.push(await page.evaluate(() => (document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? '').trim()))
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)
    expect(outline, `focus ring on "${order.at(-1)}"`).not.toBe('none')
  }
  // Back to chat, then ONE stop for the whole Light/Dark group (the selected tile), then Exit guest.
  expect(order[0]).toBe('Back to chat')
  expect(order[1]).toBe('Light theme')
  expect(order[2]).toBe('Exit guest')
  await page.keyboard.press('Tab') // past the last control the focus leaves the page; it does not get stuck
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
})

test('mobile drawer from Settings: opens, closes with Escape and with a tap outside, and its items work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await guest(page)
  await openSettings(page)
  const hamburger = page.getByRole('button', { name: 'Open sidebar' })
  await expect(hamburger).toHaveAttribute('aria-expanded', 'false')
  await hamburger.click()
  await expect(hamburger).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'New chat', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(hamburger).toHaveAttribute('aria-expanded', 'false')
  await hamburger.click()
  await page.mouse.click(380, 400) // on the dimmed area beside the drawer
  await expect(hamburger).toHaveAttribute('aria-expanded', 'false')
  await hamburger.click()
  await page.getByRole('button', { name: 'New chat', exact: true }).click()
  await expect(page).toHaveURL(/\/chat$/)
  await expect(page.getByRole('button', { name: 'Open sidebar' })).toHaveAttribute('aria-expanded', 'false')
})

for (const theme of ['light', 'dark'] as const) {
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [1024, 768], [1440, 900]] as const) {
    test(`layout in ${theme} at ${width}x${height}: no sideways scroll, everything reachable, no clipped text`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('ai-chat-theme', value), theme)
      await page.setViewportSize({ width, height })
      await guest(page)
      await openSettings(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      expect(await page.locator('.settings-main').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
      for (const name of ['Back to chat', 'Exit guest']) {
        const button = page.getByRole('button', { name, exact: true })
        await button.scrollIntoViewIfNeeded()
        await expect(button).toBeInViewport()
        const box = (await button.boundingBox())!
        if (width < 1024) expect(box.height, `${name} touch target`).toBeGreaterThanOrEqual(32)
      }
      for (const label of ['Light', 'Dark'] as const) {
        const tile = page.getByRole('radio', { name: `${label} theme` })
        await tile.scrollIntoViewIfNeeded()
        const box = (await tile.boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(width)
      }
    })
  }
}

test.describe('with a Google account (Auth emulator)', () => {
  async function signInWithGoogle(page: Page, name: string, email: string) {
    await mockChat(page)
    await page.goto(emulatorApp)
    const popupReady = page.waitForEvent('popup')
    await page.getByRole('button', { name: 'Continue with Google' }).click()
    const popup = await popupReady
    await popup.waitForLoadState('domcontentloaded')
    await popup.getByText('Add new account', { exact: true }).click()
    await popup.locator('#email-input').fill(email)
    await popup.locator('#display-name-input').fill(name)
    await popup.getByRole('button', { name: 'Sign in with Google.com', exact: true }).click()
    await expect(page).toHaveURL(/\/chat$/)
  }

  test('Account and Session show the real profile; history rows work from Settings; Log out signs out', async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 1024 })
    const email = `settings-${Date.now()}@example.com`
    await signInWithGoogle(page, 'Settings Tester', email)
    await send(page, 'First topic')
    await page.getByRole('button', { name: 'New chat', exact: true }).click()
    await send(page, 'Second topic')

    await openSettings(page)
    await expect(account(page)).toContainText('Settings Tester')
    await expect(account(page)).toContainText(email)
    await expect(account(page).getByText('Google account', { exact: true })).toBeVisible()
    await expect(account(page).getByText('S', { exact: true })).toBeVisible()
    await expect(page.getByText('Signed in with Google')).toBeVisible()
    await expect(page.getByText('Log out on this device.')).toBeVisible()

    // The history in the sidebar is usable from Settings, and selecting a row goes back to that chat.
    await expect(page.getByRole('navigation', { name: 'Conversations' }).getByRole('button', { name: 'First topic', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'First topic', exact: true }).click()
    await expect(page).toHaveURL(/\/chat$/)
    await expect(page.getByRole('log')).toContainText('First topic')
    await expect(page.getByRole('log')).not.toContainText('Second topic')

    await openSettings(page)
    await page.getByRole('button', { name: 'Log out', exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  })
})
