// The message composer: a one-line-tall input with icon-only Voice and Send/Stop buttons of the same height.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const app = 'http://127.0.0.1:5180'
const API = 'http://127.0.0.1:3999'
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }

async function openChat(page: Page, slowReply = false) {
  await page.route(`${API}/**`, async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (slowReply) await new Promise((resolve) => setTimeout(resolve, 1500))
    return route.fulfill({ status: 200, headers: cors, json: { reply: 'A reply' } })
  })
  await page.goto(app)
  await page.getByRole('button', { name: 'Guest', exact: true }).click()
  await expect(page).toHaveURL(/\/chat$/)
}

const input = (page: Page) => page.getByRole('textbox', { name: 'Message AI Chat' })

for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`input, Voice and Send have the same height and show no text at ${width}x${height} (${theme})`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('ai-chat-theme', value), theme)
      await page.setViewportSize({ width, height })
      await openChat(page)
      const box = (await input(page).boundingBox())!
      const voice = (await page.getByRole('button', { name: 'Voice input' }).boundingBox())!
      const send = (await page.getByRole('button', { name: 'Send', exact: true }).boundingBox())!
      expect(Math.abs(voice.height - box.height)).toBeLessThan(1)
      expect(Math.abs(send.height - box.height)).toBeLessThan(1)
      // One line of text plus padding: not the tall box it used to be (at least 1.5x shorter than before).
      const root = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
      expect(box.height / root).toBeLessThan(width >= 1024 ? 4.5 : 3.7)
      // The buttons carry no visible text, only an icon; their names come from aria-label.
      await expect(page.getByRole('button', { name: 'Voice input' })).toHaveText('')
      await expect(page.getByRole('button', { name: 'Send', exact: true })).toHaveText('')
      await expect(page.getByRole('button', { name: 'Send', exact: true }).locator('svg')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Voice input' }).locator('svg')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    })
  }
}

test('Stop replaces Send with the same height and no text, and Send is back after the reply', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openChat(page, true)
  await input(page).fill('hello')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  const stop = page.getByRole('button', { name: 'Stop', exact: true })
  await expect(stop).toBeVisible()
  await expect(stop).toHaveText('')
  const box = (await input(page).boundingBox())!
  expect(Math.abs((await stop.boundingBox())!.height - box.height)).toBeLessThan(1)
  await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeVisible({ timeout: 8000 })
})

test('Send still works with the keyboard and click; Enter sends, Shift+Enter adds a line', async ({ page }) => {
  await openChat(page)
  await input(page).fill('first')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByRole('log').getByText('first', { exact: true })).toBeVisible()
  await input(page).fill('second')
  await input(page).press('Enter')
  await expect(page.getByRole('log').getByText('second', { exact: true })).toBeVisible()
  await input(page).click()
  await page.keyboard.type('line one')
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('line two')
  expect(await input(page).inputValue()).toBe('line one\nline two')
})

test('a longer message makes the input grow and the buttons keep their size', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openChat(page)
  const before = (await input(page).boundingBox())!
  const sendBefore = (await page.getByRole('button', { name: 'Send', exact: true }).boundingBox())!
  await input(page).fill('one\ntwo\nthree\nfour\nfive')
  const after = (await input(page).boundingBox())!
  const sendAfter = (await page.getByRole('button', { name: 'Send', exact: true }).boundingBox())!
  expect(after.height).toBeGreaterThan(before.height + 40)
  expect(sendAfter.height).toBeCloseTo(sendBefore.height, 0)
  // The button stays beside the top of the input instead of stretching down with it.
  expect(sendAfter.y - after.y).toBeCloseTo(sendBefore.y - before.y, 0)
})
