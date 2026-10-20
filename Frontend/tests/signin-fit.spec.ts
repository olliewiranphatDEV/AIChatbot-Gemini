// The Sign-in page must show everything (including the Guest button) in one screen on phones and tablets.
import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const app = 'http://127.0.0.1:5180'
const screenshots = '.verification.local/signin-screenshots'
mkdirSync(screenshots, { recursive: true })

const sizes = [
  [360, 640],
  [375, 667],
  [360, 800],
  [390, 844],
  [393, 852],
  [412, 915],
  [440, 956],
  [768, 1024],
  [820, 1180],
  [1024, 768],
  [1032, 1376],
  [1024, 1366],
  [834, 1194],
  [1366, 1024],
  [1376, 1032],
  [1440, 900],
] as const

for (const [width, height] of sizes) {
  test(`Sign-in fits in one screen at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto(app)
    await expect(page.getByRole('button', { name: 'Guest', exact: true })).toBeVisible()
    const m = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(m.scrollHeight, `content ${m.scrollHeight}px in a ${m.clientHeight}px screen`).toBeLessThanOrEqual(m.clientHeight + 1)
    expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth)
    // Both ways in are completely on screen.
    for (const name of ['Continue with Google', 'Guest']) {
      const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!
      expect(box.y + box.height, `${name} bottom`).toBeLessThanOrEqual(height)
      // Touch targets on phones and tablets; the desktop design keeps its own sizes.
      if (width < 1024) expect(box.height).toBeGreaterThanOrEqual(44)
    }
    await page.screenshot({ path: `${screenshots}/signin-${width}x${height}.png` })
  })
}

test('Sign-in still scrolls (instead of clipping) on a very short screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 })
  await page.goto(app)
  await page.getByRole('button', { name: 'Guest', exact: true }).scrollIntoViewIfNeeded()
  const box = (await page.getByRole('button', { name: 'Guest', exact: true }).boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(480)
})

test('the desktop two-column Sign-in is unchanged: the conversation preview is complete', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1024 })
  await page.goto(app)
  await expect(page.getByText('What do you want to achieve?')).toBeVisible()
  await expect(page.getByText('Let’s start with your goal.')).toBeVisible()
})

test('a tall tablet in portrait (iPad Pro 13) is stacked like the smaller iPad, a wide landscape screen is two columns', async ({ page }) => {
  const guestCentre = async (width: number, height: number) => {
    await page.setViewportSize({ width, height })
    await page.goto(app)
    const box = (await page.getByRole('button', { name: 'Guest', exact: true }).boundingBox())!
    return (box.x + box.width / 2) / width
  }
  expect(await guestCentre(1032, 1376)).toBeCloseTo(0.5, 1) // portrait: one centred column
  expect(await guestCentre(768, 1024)).toBeCloseTo(0.5, 1)
  expect(await guestCentre(1376, 1032)).toBeGreaterThan(0.7) // landscape: sign-in is the right-hand column
  expect(await guestCentre(1536, 1024)).toBeGreaterThan(0.7)
})
