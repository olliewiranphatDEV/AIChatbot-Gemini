import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const noConfig = 'http://127.0.0.1:5180'
const emulatorApp = 'http://127.0.0.1:5181'
const screenshots = '.verification.local/auth-screenshots'
mkdirSync(screenshots, { recursive: true })

async function openSidebar(page: Page) {
  const menu = page.getByRole('button', { name: 'Open sidebar' })
  if (await menu.isVisible()) await menu.click()
}

async function openSettings(page: Page) {
  await openSidebar(page)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page).toHaveURL(/\/settings$/)
}

async function send(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Message AI Chat' }).fill(text)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByRole('log').getByText(text, { exact: true })).toBeVisible()
}

async function emulatorSignIn(page: Page, name: string, email: string) {
  const popupReady = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  const popup = await popupReady
  // The emulator's form event handlers are attached by its page scripts.
  await popup.waitForLoadState('domcontentloaded')
  await popup.getByText('Add new account', { exact: true }).click()
  await popup.locator('#email-input').fill(email)
  await popup.locator('#display-name-input').fill(name)
  await popup.getByRole('button', { name: 'Sign in with Google.com', exact: true }).click()
  await expect(page).toHaveURL(/\/chat$/)
}

test('missing configuration shows an error and never fabricates a Google session', async ({ page }) => {
  await page.goto(noConfig)
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page.getByRole('alert')).toContainText('Google sign-in is currently unavailable')
  await expect(page.getByRole('button', { name: 'Guest', exact: true })).toBeEnabled()
  await expect(page.getByRole('textbox', { name: 'Message AI Chat' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Guest', exact: true }).click()
  await expect(page).toHaveURL(/\/chat$/)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('Guest keeps only its current chat in memory and discards it on new chat, exit, or reload', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1024 })
  await page.goto(noConfig)
  await page.getByRole('button', { name: 'Guest', exact: true }).click()
  const message = 'Guest message must never be saved'
  await send(page, message)
  await page.getByRole('textbox', { name: 'Message AI Chat' }).fill('Temporary draft')
  await expect(page.getByRole('navigation', { name: 'Conversations' }).getByRole('button')).toHaveCount(0)
  await openSettings(page)
  await expect(page.locator('#account-heading + .settings-card')).toContainText('Guest')
  await expect(page.getByText('Google account', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Back to chat' }).click()
  await expect(page.getByRole('log')).toContainText(message)
  await expect(page.getByRole('textbox', { name: 'Message AI Chat' })).toHaveValue('Temporary draft')
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 })
  expect(await page.evaluate(() => indexedDB.databases())).toEqual([])

  await page.getByRole('button', { name: 'New chat', exact: true }).click()
  await expect(page.getByRole('log')).toBeEmpty()
  await expect(page.getByRole('textbox', { name: 'Message AI Chat' })).toHaveValue('')
  await send(page, 'Second temporary message')
  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Guest', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Guest', exact: true }).click()
  await expect(page.getByRole('log')).toBeEmpty()
  await send(page, 'Discard this on exit')
  await openSettings(page)
  await page.getByRole('button', { name: 'Exit guest', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Guest', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Guest', exact: true }).click()
  await expect(page.getByRole('log')).toBeEmpty()
})

test('direct protected URLs require Google or Guest access', async ({ page }) => {
  for (const route of ['/chat', '/settings']) {
    await page.goto(`${noConfig}${route}`)
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Guest', exact: true })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Message AI Chat' })).toHaveCount(0)
  }
})

for (const [width, height] of [[375, 667], [390, 844], [768, 1024], [1024, 768], [1280, 585], [1366, 768], [1536, 1024], [1920, 1080]]) {
  test(`Guest and responsive navigation at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto(noConfig)
    await page.evaluate(() => document.fonts.ready)
    const guest = page.getByRole('button', { name: 'Guest', exact: true })
    await guest.scrollIntoViewIfNeeded()
    expect(await guest.evaluate(button => {
      const style = getComputedStyle(button)
      return { color: style.color, border: style.borderTopColor, background: style.backgroundColor }
    })).toEqual({ color: 'rgb(26, 106, 91)', border: 'rgb(26, 106, 91)', background: 'rgb(255, 255, 255)' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await page.screenshot({ path: `${screenshots}/signin-${width}x${height}.png`, fullPage: true })
    await guest.click()
    await expect(page).toHaveURL(/\/chat$/)
    await send(page, `Guest at ${width}`)
    const chatRoot = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)
    await openSettings(page)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(chatRoot)
    expect(await page.locator('.settings-main').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false)
    await page.screenshot({ path: `${screenshots}/settings-${width}x${height}.png` })
    const light = page.getByRole('radio', { name: 'Light theme' })
    await light.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Dark theme' })).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('Home')
    await expect(light).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('button', { name: 'Exit guest', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Exit guest', exact: true })).toBeInViewport()
    if (width < 1024) {
      await openSidebar(page)
      await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Open sidebar' })).toHaveAttribute('aria-expanded', 'false')
    }
    await page.getByRole('button', { name: 'Back to chat' }).click()
    await expect(page.getByRole('log')).toContainText(`Guest at ${width}`)
  })
}

test('Google popup authenticates, uses the actual profile, restores login, and logs out', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1024 })
  await page.goto(emulatorApp)
  const name = 'Test Ollie'
  const email = `test-${Date.now()}@example.com`
  await emulatorSignIn(page, name, email)
  await send(page, 'First Google conversation')
  await page.getByRole('textbox', { name: 'Message AI Chat' }).fill('Google draft')
  await openSettings(page)
  await expect(page.locator('#account-heading + .settings-card')).toContainText(name)
  await expect(page.locator('#account-heading + .settings-card')).toContainText(email)
  await expect(page.getByText('Google account', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Back to chat' }).click()
  await expect(page.getByRole('log')).toContainText('First Google conversation')
  await expect(page.getByRole('textbox', { name: 'Message AI Chat' })).toHaveValue('Google draft')
  await page.getByRole('button', { name: 'New chat', exact: true }).click()
  await send(page, 'Second Google conversation')
  await openSettings(page)
  await page.getByRole('button', { name: 'First Google conversation', exact: true }).click()
  await expect(page.getByRole('log')).toContainText('First Google conversation')
  await page.reload()
  await expect(page).toHaveURL(/\/chat$/)
  await expect(page.getByRole('textbox', { name: 'Message AI Chat' })).toBeVisible()
  await expect(page.getByRole('log')).toBeEmpty()
  await openSettings(page)
  await expect(page.locator('#account-heading + .settings-card')).toContainText(email)
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  await page.goto(`${emulatorApp}/settings`)
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('button', { name: 'Guest', exact: true }).click()
  await expect(page.getByRole('log')).toBeEmpty()
  await expect(page.getByRole('navigation', { name: 'Conversations' }).getByRole('button')).toHaveCount(0)
})

test('canceling the Google popup keeps the user signed out and permits Guest access', async ({ page }) => {
  await page.goto(emulatorApp)
  const popupReady = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  const popup = await popupReady
  await expect(page.getByRole('button', { name: 'Guest', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Signing in...' })).toBeDisabled()
  await popup.close()
  // Firebase allows in-flight authentication events to finish after a popup
  // closes; its cancellation delay can exceed the normal assertion timeout.
  await expect(page.getByRole('alert')).toContainText('Sign-in was canceled', { timeout: 20_000 })
  await expect(page.getByRole('button', { name: 'Guest', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Guest', exact: true }).click()
  await expect(page).toHaveURL(/\/chat$/)
})

test('Guest does not create an anonymous Firebase account even when Firebase is configured', async ({ page, request }) => {
  const accountsUrl = 'http://127.0.0.1:9099/emulator/v1/projects/demo-ai-chatbot/accounts'
  const before = await (await request.get(accountsUrl)).json()
  await page.goto(emulatorApp)
  await page.getByRole('button', { name: 'Guest', exact: true }).click()
  await expect(page).toHaveURL(/\/chat$/)
  await send(page, 'Guest with Firebase configured')
  const after = await (await request.get(accountsUrl)).json()
  expect(after.users?.length ?? 0).toBe(before.users?.length ?? 0)
  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
})
