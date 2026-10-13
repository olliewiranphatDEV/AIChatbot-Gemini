import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const noConfig = 'http://127.0.0.1:5180'
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
