import { test, expect } from '@playwright/test'
import type { Locator } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const screenshots = '.verification.local/typography-screenshots'
mkdirSync(screenshots, { recursive: true })

async function textStyle(locator: Locator) {
  return locator.evaluate(element => {
    const style = getComputedStyle(element)
    return {
      family: style.fontFamily,
      size: style.fontSize,
      weight: style.fontWeight,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
    }
  })
}

for (const [width, height] of [[375, 667], [390, 844], [768, 1024], [1024, 768], [1280, 585], [1366, 768], [1536, 1024], [1920, 1080]]) {
  test(`Chat and Settings share typography at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('http://127.0.0.1:5180')
    await page.evaluate(() => document.fonts.ready)
    const signInTitle = await textStyle(page.getByRole('heading', { name: 'Welcome to AI Chat' }))
    const signInSubtitle = await textStyle(page.getByText('Sign in to start a conversation.'))
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
    await page.getByRole('button', { name: 'Guest', exact: true }).click()
    const menu = page.getByRole('button', { name: 'Open sidebar' })
    if (await menu.isVisible()) await menu.click()
    const sidebar = page.getByRole('complementary', { name: 'Chat history' })
    const styles = {
      title: await textStyle(page.getByRole('heading', { level: 1 })),
      brand: await textStyle(sidebar.getByText('AI Chat', { exact: true })),
      newChat: await textStyle(sidebar.getByRole('button', { name: 'New chat', exact: true })),
      user: await textStyle(sidebar.getByText('Guest', { exact: true })),
      settings: await textStyle(sidebar.getByRole('button', { name: 'Settings', exact: true })),
      subtitle: await textStyle(page.getByRole('textbox', { name: 'Message AI Chat' })),
    }
    // At these viewports Sign-in and the workspace have the same base rem.
    if (width < 1024 || (width === 1536 && height === 1024)) {
      expect(signInTitle).toEqual(styles.title)
      expect(signInSubtitle).toEqual(styles.subtitle)
    }
    await sidebar.getByRole('button', { name: 'Settings', exact: true }).click()
    await expect(page).toHaveURL(/\/settings$/)
    expect(await textStyle(page.getByRole('heading', { name: 'Settings', exact: true }))).toEqual(styles.title)
    expect(await textStyle(page.getByText('Make AI Chat feel like your space.'))).toEqual(styles.subtitle)
    if (await menu.isVisible()) await menu.click()
    expect(await textStyle(sidebar.getByText('AI Chat', { exact: true }))).toEqual(styles.brand)
    expect(await textStyle(sidebar.getByRole('button', { name: 'New chat', exact: true }))).toEqual(styles.newChat)
    expect(await textStyle(sidebar.getByText('Guest', { exact: true }))).toEqual(styles.user)
    expect(await textStyle(sidebar.getByRole('button', { name: 'Settings', exact: true }))).toEqual(styles.settings)
    if (await menu.isVisible()) await page.keyboard.press('Escape')
    expect(await textStyle(page.getByRole('heading', { name: 'Account', exact: true }))).toEqual(
      await textStyle(page.getByRole('heading', { name: 'Appearance', exact: true })),
    )
    expect(await textStyle(page.getByRole('heading', { name: 'Theme', exact: true }))).toEqual(
      await textStyle(page.getByRole('heading', { name: 'Guest session', exact: true })),
    )
    expect(await textStyle(page.getByText('Choose how AI Chat looks.'))).toEqual(
      await textStyle(page.getByText('Chat history is not saved.')),
    )
    expect(await page.locator('.settings-main').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await page.screenshot({ path: `${screenshots}/settings-${width}x${height}.png` })
    await page.getByRole('button', { name: 'Exit guest' }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Exit guest' })).toBeInViewport()
    await page.getByRole('button', { name: 'Back to chat' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('New chat')
    await page.screenshot({ path: `${screenshots}/chat-${width}x${height}.png` })
  })
}
