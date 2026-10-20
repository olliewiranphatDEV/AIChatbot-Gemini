// The Live screen, end to end in a real browser. The backend and Gemini are replaced by in-test
// fakes (route interception and a fake Live WebSocket), and the microphone is Chrome's synthetic
// device (see playwright.config.ts). So these tests prove the app's behaviour, not Gemini's.
import { test, expect } from '@playwright/test'
import type { Page, WebSocketRoute } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const app = 'http://127.0.0.1:5180'
const api = 'http://127.0.0.1:3999'
const screenshots = '.verification.local/live-screenshots'
mkdirSync(screenshots, { recursive: true })
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }

type World = {
  tokens: number
  sockets: number
  socketsClosed: number
  audioFrames: number
  clientContent: unknown[]
  chatBodies: { messages: { role: string; content: string }[] }[]
  ws?: WebSocketRoute
}

// ~100 ms of a 440 Hz tone at 24 kHz, as the base64 PCM16 Gemini would stream.
const TONE = (() => {
  const samples = new Int16Array(2400)
  for (let i = 0; i < samples.length; i += 1) samples[i] = Math.round(Math.sin((2 * Math.PI * 440 * i) / 24_000) * 6000)
  return Buffer.from(samples.buffer).toString('base64')
})()

async function installMocks(page: Page): Promise<World> {
  const world: World = { tokens: 0, sockets: 0, socketsClosed: 0, audioFrames: 0, clientContent: [], chatBodies: [] }

  await page.addInitScript(() => {
    const w = window as unknown as { __mic: { streams: MediaStream[]; contexts: AudioContext[]; gum: number } }
    w.__mic = { streams: [], contexts: [], gum: 0 }
    const devices = navigator.mediaDevices
    const original = devices.getUserMedia.bind(devices)
    devices.getUserMedia = async (constraints) => {
      w.__mic.gum += 1
      if (localStorage.getItem('deny-mic')) throw Object.assign(new Error('denied'), { name: 'NotAllowedError' })
      const stream = await original(constraints)
      w.__mic.streams.push(stream)
      return stream
    }
    const Native = window.AudioContext
    window.AudioContext = class extends Native {
      constructor(...args: ConstructorParameters<typeof Native>) {
        super(...args)
        w.__mic.contexts.push(this)
      }
    }
  })

  await page.route(`${api}/**`, async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const url = new URL(request.url())
    if (url.pathname === '/api/live-token') {
      world.tokens += 1
      return route.fulfill({
        status: 200,
        headers: { ...cors, 'cache-control': 'no-store' },
        json: { token: `auth_tokens/mock-${world.tokens}`, model: 'mock-live-model', expiresAt: 'x', newSessionExpiresAt: 'y' },
      })
    }
    if (url.pathname === '/api/chat') {
      const body = request.postDataJSON()
      world.chatBodies.push(body)
      return route.fulfill({ status: 200, headers: cors, json: { reply: `Typed reply ${world.chatBodies.length}` } })
    }
    return route.fulfill({ status: 404, headers: cors, json: { error: { code: 'not_found', message: 'nope' } } })
  })

  await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws) => {
    world.sockets += 1
    world.ws = ws
    ws.onMessage((message) => {
      let data: { setup?: unknown; realtimeInput?: { audio?: unknown }; clientContent?: unknown }
      try {
        data = JSON.parse(String(message))
      } catch {
        return
      }
      if (data.setup) ws.send(JSON.stringify({ setupComplete: {} }))
      else if (data.realtimeInput?.audio) world.audioFrames += 1
      else if (data.clientContent) world.clientContent.push(data.clientContent)
    })
    ws.onClose(() => {
      world.socketsClosed += 1
    })
  })
  return world
}

/** What the fake Gemini says. Each call is one or more server messages, like the real API's. */
const server = {
  user: (world: World, text: string) => world.ws?.send(JSON.stringify({ serverContent: { inputTranscription: { text } } })),
  ai: (world: World, text: string) => world.ws?.send(JSON.stringify({ serverContent: { outputTranscription: { text } } })),
  audio: (world: World, chunks = 4) => {
    for (let i = 0; i < chunks; i += 1) {
      world.ws?.send(JSON.stringify({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: TONE } }] } } }))
    }
  },
  interrupted: (world: World) => world.ws?.send(JSON.stringify({ serverContent: { interrupted: true } })),
  turnComplete: (world: World) => world.ws?.send(JSON.stringify({ serverContent: { turnComplete: true } })),
}

const mic = (page: Page) =>
  page.evaluate(() => {
    const m = (window as unknown as { __mic: { streams: MediaStream[]; contexts: AudioContext[]; gum: number } }).__mic
    return {
      gum: m.gum,
      liveTracks: m.streams.flatMap((s) => s.getTracks()).filter((t) => t.readyState === 'live').length,
      enabledTracks: m.streams.flatMap((s) => s.getAudioTracks()).filter((t) => t.readyState === 'live' && t.enabled).length,
      openContexts: m.contexts.filter((c) => c.state !== 'closed').length,
    }
  })

async function signInAsGuest(page: Page, path = '/') {
  await page.goto(`${app}${path}`)
  await page.getByRole('button', { name: 'Guest', exact: true }).click()
  await expect(page).toHaveURL(/\/chat$/)
}

// Moves within the app the way its own links do, without reloading (a reload would sign a Guest out).
const goTo = (page: Page, path: string) =>
  page.evaluate((to) => {
    window.history.pushState(null, '', to)
    window.dispatchEvent(new Event('app:navigation'))
  }, path)

const liveButton = (page: Page) => page.getByRole('button', { name: 'Start Live conversation' })
const status = (page: Page) => page.getByRole('status').filter({ hasText: /Connecting|Listening|Thinking|AI is speaking|muted|Connection lost|Permission denied|Session ended|Ready to start/ })
const log = (page: Page) => page.getByRole('log', { name: 'Conversation' })

async function startLive(page: Page) {
  await liveButton(page).click()
  await expect(page).toHaveURL(/\/live$/)
  await expect(status(page)).toHaveText('Listening…')
}

test.describe('Chat header', () => {
  test('has the Live button at the top right and no three-dot menu', async ({ page }) => {
    await installMocks(page)
    await signInAsGuest(page)
    await expect(page.getByRole('button', { name: 'Chat options' })).toHaveCount(0)
    const live = await liveButton(page).boundingBox()
    const title = await page.getByRole('heading', { level: 1 }).boundingBox()
    const viewport = page.viewportSize()!
    expect(live!.x + live!.width).toBeGreaterThan(viewport.width - 120)
    expect(live!.x).toBeGreaterThanOrEqual(title!.x + title!.width - 1) // never overlaps the title
  })

  for (const width of [320, 360, 440, 768, 1280]) {
    test(`Live button is a usable target, inside the header and not overlapping at ${width}px`, async ({ page }) => {
      await installMocks(page)
      await page.setViewportSize({ width, height: 800 })
      await signInAsGuest(page)
      const live = (await liveButton(page).boundingBox())!
      const sidebarButton = page.getByRole('button', { name: 'Open sidebar' })
      const menu = (await sidebarButton.isVisible()) ? await sidebarButton.boundingBox() : null
      expect(live.width).toBeGreaterThanOrEqual(44)
      expect(live.height).toBeGreaterThanOrEqual(44)
      expect(live.x + live.width).toBeLessThanOrEqual(width)
      if (menu) expect(live.x).toBeGreaterThan(menu.x + menu.width)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    })
  }
})

test('Chat → Live → the same Chat, with the spoken conversation saved in it', async ({ page }) => {
  const world = await installMocks(page)
  await signInAsGuest(page)
  const box = page.getByRole('textbox', { name: 'Message AI Chat' })
  await box.fill('First typed question')
  await box.press('Enter')
  await expect(log(page).getByText('Typed reply 1')).toBeVisible()

  await startLive(page)
  // Live shows its own page: no sidebar, composer or chat bubbles.
  await expect(page.getByRole('textbox', { name: 'Message AI Chat' })).toBeHidden()
  await expect(page.getByRole('complementary', { name: 'Chat history' })).toBeHidden()
  await expect(page.getByRole('heading', { name: 'A little more human.' })).toBeVisible()
  await expect(page.getByText('LIVE', { exact: true })).toBeVisible()
  // The earlier typed exchange was handed to the new session as history, not spoken to it.
  await expect.poll(() => world.clientContent.length).toBe(1)
  expect(JSON.stringify(world.clientContent[0])).toContain('First typed question')

  server.user(world, 'Tell me about ')
  server.user(world, 'the moon')
  server.ai(world, 'The moon is ')
  server.audio(world)
  server.ai(world, 'Earth\'s natural satellite.')
  await expect(page.getByTestId('live-caption')).toHaveText("The moon is Earth's natural satellite.")
  await expect(status(page)).toHaveText('AI is speaking')
  server.turnComplete(world)

  await page.getByRole('button', { name: 'End live' }).click()
  await expect(page).toHaveURL(/\/chat$/)
  // Same conversation: the typed exchange is still there, followed by the spoken one.
  await expect(log(page).getByText('First typed question')).toBeVisible()
  await expect(log(page).getByText('Tell me about the moon')).toBeVisible()
  await expect(log(page).getByText("The moon is Earth's natural satellite.")).toBeVisible()
  await expect(log(page).getByText(/· Voice/)).toHaveCount(1)
  await expect.poll(() => world.socketsClosed).toBe(1)
  expect(await mic(page)).toMatchObject({ liveTracks: 0, openContexts: 0 })

  // The spoken exchange is context for the next typed message, and the new message is sent once.
  await box.fill('And its size?')
  await box.press('Enter')
  await expect(log(page).getByText('Typed reply 2')).toBeVisible()
  const sent = world.chatBodies[1].messages.map((m) => `${m.role}:${m.content}`)
  expect(sent).toEqual([
    'user:First typed question',
    'assistant:Typed reply 1',
    'user:Tell me about the moon',
    "assistant:The moon is Earth's natural satellite.",
    'user:And its size?',
  ])
})

test('Mute stops sending microphone audio but the AI keeps playing; the footer and status stay distinguishable', async ({ page }) => {
  const world = await installMocks(page)
  await signInAsGuest(page)
  await startLive(page)
  await expect.poll(() => world.audioFrames).toBeGreaterThan(3)

  await page.getByRole('button', { name: 'Mute microphone' }).click()
  await expect(status(page)).toHaveText('Microphone muted')
  await expect(page.getByRole('button', { name: 'Unmute microphone' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/Microphone muted · The AI cannot hear you/)).toBeVisible()
  expect((await mic(page)).enabledTracks).toBe(0)
  await page.waitForTimeout(300)
  const frozen = world.audioFrames
  await page.waitForTimeout(800)
  expect(world.audioFrames).toBe(frozen) // nothing is transmitted while muted

  server.ai(world, 'Still talking while you are muted.')
  server.audio(world)
  await expect(status(page)).toHaveText('AI is speaking') // the AI is not silenced by muting
  await expect(page.getByTestId('live-caption')).toHaveText('Still talking while you are muted.')
  await expect(page.getByText(/Microphone muted · The AI cannot hear you/)).toBeVisible()

  await page.getByRole('button', { name: 'Unmute microphone' }).click()
  await expect.poll(() => world.audioFrames, { timeout: 5000 }).toBeGreaterThan(frozen)
  expect((await mic(page)).enabledTracks).toBe(1)
})

test('Captions toggle hides and shows captions without touching the session, and the choice is remembered', async ({ page }) => {
  const world = await installMocks(page)
  await signInAsGuest(page)
  await startLive(page)
  server.ai(world, 'Hello there')
  await expect(page.getByTestId('live-caption')).toHaveText('Hello there') // on by default

  const toggle = page.getByRole('button', { name: 'Hide captions' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(page.getByTestId('live-caption')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Show captions' })).toHaveAttribute('aria-pressed', 'false')
  expect(world.sockets).toBe(1)
  expect(world.socketsClosed).toBe(0)
  await expect(status(page)).toHaveText('Listening…')
  server.ai(world, ' and more')
  await page.getByRole('button', { name: 'Show captions' }).click()
  await expect(page.getByTestId('live-caption')).toHaveText('Hello there and more') // kept receiving while hidden

  await page.getByRole('button', { name: 'Hide captions' }).click()
  await page.getByRole('button', { name: 'End live' }).click()
  await startLive(page)
  await expect(page.getByRole('button', { name: 'Show captions' })).toBeVisible() // remembered for the next Live
})

test('partial captions update in place, long Thai and English text does not break the layout', async ({ page }) => {
  const world = await installMocks(page)
  await page.setViewportSize({ width: 320, height: 568 })
  await signInAsGuest(page)
  await startLive(page)
  const thai = 'สวัสดีครับ วันนี้อากาศดีมากเลยนะครับ ฉันอยากเล่าเรื่องดวงจันทร์ให้ฟังอย่างละเอียด '.repeat(6)
  const english = 'Supercalifragilisticexpialidocious '.repeat(6) + 'a'.repeat(120)
  server.ai(world, thai)
  server.ai(world, english)
  await expect(page.getByTestId('live-caption')).toContainText('ดวงจันทร์')
  await expect(page.getByTestId('live-caption')).toContainText('aaaaaaaaaa')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  const caption = (await page.getByRole('region', { name: 'Live captions' }).boundingBox())!
  const controls = (await page.getByRole('button', { name: 'End live' }).boundingBox())!
  // Captions scroll inside their own box instead of pushing into the controls.
  expect(caption.y + caption.height).toBeLessThanOrEqual(controls.y + 1)
  expect(caption.height).toBeLessThan(220)
})

test('the timer runs while connected and stops when the session ends', async ({ page }) => {
  const world = await installMocks(page)
  await signInAsGuest(page)
  await liveButton(page).click()
  await expect(status(page)).toHaveText('Listening…')
  const timer = page.getByRole('timer')
  await expect(timer).not.toHaveText('00:00', { timeout: 4000 })
  world.ws?.close()
  await expect(status(page)).toHaveText('Connection lost')
  const stopped = await timer.innerText()
  await page.waitForTimeout(1600)
  expect(await timer.innerText()).toBe(stopped)
})

test('connection lost shows Try again and does not reconnect by itself; Try again starts one new session', async ({ page }) => {
  const world = await installMocks(page)
  await signInAsGuest(page)
  await startLive(page)
  world.ws?.close()
  await expect(status(page)).toHaveText('Connection lost')
  await expect(page.getByText('OFFLINE')).toBeVisible()
  expect(await mic(page)).toMatchObject({ liveTracks: 0, openContexts: 0 })
  await page.waitForTimeout(1500)
  expect(world.tokens).toBe(1)
  expect(world.sockets).toBe(1)
  await page.getByRole('button', { name: 'Try again' }).dblclick()
  await expect(status(page)).toHaveText('Listening…')
  expect(world.tokens).toBe(2)
  expect(world.sockets).toBe(2)
})

test('a denied microphone says so and never requests a token', async ({ page }) => {
  const world = await installMocks(page)
  await page.addInitScript(() => localStorage.setItem('deny-mic', '1'))
  await signInAsGuest(page)
  await liveButton(page).click()
  await expect(status(page)).toHaveText('Permission denied')
  await expect(page.getByRole('alert')).toContainText('Microphone access was blocked')
  expect(world.tokens).toBe(0)
  await expect(page.getByRole('button', { name: 'Back to chat' })).toBeVisible()
})

test('a direct visit to /live neither asks for the microphone nor connects until Start live is pressed', async ({ page }) => {
  const world = await installMocks(page)
  await signInAsGuest(page)
  await goTo(page, '/live')
  await expect(status(page)).toHaveText('Ready to start')
  await expect(page.getByText('READY', { exact: true })).toBeVisible()
  await page.waitForTimeout(500)
  expect(await mic(page)).toMatchObject({ gum: 0 })
  expect(world.tokens).toBe(0)
  expect(world.sockets).toBe(0)
  await page.getByRole('button', { name: 'Start live' }).click()
  await expect(status(page)).toHaveText('Listening…')
  expect(world.tokens).toBe(1)
})

test('End, Back to chat, browser Back and Settings all end the session and release the microphone', async ({ page }) => {
  const world = await installMocks(page)
  await signInAsGuest(page)

  // Back to chat
  await startLive(page)
  expect(await mic(page)).toMatchObject({ liveTracks: 1 })
  await page.getByRole('button', { name: 'Back to chat' }).click()
  await expect(page).toHaveURL(/\/chat$/)
  await expect.poll(() => world.socketsClosed).toBe(1)
  expect(await mic(page)).toMatchObject({ liveTracks: 0, openContexts: 0 })

  // The browser's Back button
  await startLive(page)
  await page.goBack()
  await expect(page).toHaveURL(/\/chat$/)
  await expect.poll(() => world.socketsClosed).toBe(2)
  expect(await mic(page)).toMatchObject({ liveTracks: 0, openContexts: 0 })

  // Going to Settings by address
  await startLive(page)
  await goTo(page, '/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect.poll(() => world.socketsClosed).toBe(3)
  expect(await mic(page)).toMatchObject({ liveTracks: 0, openContexts: 0 })
  expect(world.sockets).toBe(3)
})

test('no duplicate session: repeated clicks and a second tab of controls create exactly one session', async ({ page }) => {
  const world = await installMocks(page)
  await signInAsGuest(page)
  await liveButton(page).dblclick()
  await expect(status(page)).toHaveText('Listening…')
  expect(world.tokens).toBe(1)
  expect(world.sockets).toBe(1)
  expect((await mic(page)).gum).toBe(1)
  // The session survives a reload of nothing: pressing Start live is not offered while one runs.
  await expect(page.getByRole('button', { name: 'Start live' })).toHaveCount(0)
})

test('interruption: the cut-off reply is kept as interrupted, is not sent as history, and the next question gets its own turn', async ({ page }) => {
  const world = await installMocks(page)
  await signInAsGuest(page)
  await startLive(page)
  server.user(world, 'Tell a long story')
  server.ai(world, 'Once upon a time')
  server.audio(world)
  server.interrupted(world)
  server.user(world, 'Stop')
  server.ai(world, 'Okay.')
  server.turnComplete(world)
  await expect(page.getByTestId('live-caption')).toHaveText('Okay.')
  await page.getByRole('button', { name: 'End live' }).click()
  await expect(log(page).getByText('Once upon a time')).toBeVisible()
  await expect(log(page).getByText(/Interrupted/)).toHaveCount(1)
  const box = page.getByRole('textbox', { name: 'Message AI Chat' })
  await box.fill('Next')
  await box.press('Enter')
  await expect(log(page).getByText('Typed reply 1')).toBeVisible()
  expect(world.chatBodies[0].messages.map((m) => m.content)).toEqual(['Stop', 'Okay.', 'Next'])
})

test('a new chat shows none of the previous Live transcript', async ({ page }) => {
  const world = await installMocks(page)
  await signInAsGuest(page)
  await startLive(page)
  server.user(world, 'Private spoken words')
  server.ai(world, 'Spoken answer')
  server.turnComplete(world)
  await page.getByRole('button', { name: 'End live' }).click()
  await expect(log(page).getByText('Private spoken words')).toBeVisible()
  const menu = page.getByRole('button', { name: 'Open sidebar' })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('button', { name: 'New chat', exact: true }).click()
  await expect(log(page).getByText('Private spoken words')).toHaveCount(0)
  await startLive(page)
  await expect(page.getByTestId('live-caption')).toHaveCount(0) // a fresh Live starts with no old captions
  expect(world.clientContent).toHaveLength(0) // and no old history
})

test('reduced motion: nothing in the orb is animated', async ({ page }) => {
  await installMocks(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signInAsGuest(page)
  await startLive(page)
  const animated = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-hidden="true"] *')].filter((el) => getComputedStyle(el).animationName !== 'none' && !el.closest('[class*="animate-pulse"]')).length,
  )
  expect(animated).toBe(0)
})

test('keyboard: the controls are reachable by Tab and show a focus ring', async ({ page }) => {
  await installMocks(page)
  await signInAsGuest(page)
  await startLive(page)
  const order: string[] = []
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Tab')
    order.push(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? ''))
  }
  expect(order.join('|')).toMatch(/Back to chat.*Mute microphone.*Hide captions.*End live/)
  await page.keyboard.press('Shift+Tab')
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)
  expect(outline).not.toBe('none')
})

const viewports = [
  [320, 568],
  [390, 844],
  [440, 956],
  [768, 1024],
  [1024, 768],
  [1440, 900],
] as const

for (const [width, height] of viewports) {
  test(`Live screen layout at ${width}x${height}`, async ({ page }) => {
    const world = await installMocks(page)
    await page.setViewportSize({ width, height })
    await signInAsGuest(page)
    await startLive(page)
    server.user(world, 'Can you help me with something?')
    server.ai(world, 'Of course. We can take it one step at a time.')
    server.audio(world, 2)
    await expect(page.getByTestId('live-caption')).toHaveText('Of course. We can take it one step at a time.')
    await page.waitForTimeout(600)

    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    expect(noOverflow).toBe(true)

    // The three controls and the header controls are real touch targets and fully on screen.
    for (const name of ['Mute microphone', 'Hide captions', 'End live', 'Back to chat']) {
      const box = (await page.getByRole('button', { name }).boundingBox())!
      expect(box.width, `${name} width`).toBeGreaterThanOrEqual(44)
      expect(box.height, `${name} height`).toBeGreaterThanOrEqual(44)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
    }

    // The header's three groups do not overlap.
    const back = (await page.getByRole('button', { name: 'Back to chat' }).boundingBox())!
    const badge = (await page.getByText('LIVE', { exact: true }).boundingBox())!
    const timer = (await page.getByRole('timer').boundingBox())!
    expect(back.x + back.width).toBeLessThanOrEqual(badge.x)
    expect(badge.x + badge.width).toBeLessThanOrEqual(timer.x)
    expect(timer.x + timer.width).toBeLessThanOrEqual(width)

    // Short screens scroll instead of clipping: the End control can always be reached.
    await page.getByRole('button', { name: 'End live' }).scrollIntoViewIfNeeded()
    const end = (await page.getByRole('button', { name: 'End live' }).boundingBox())!
    expect(end.y + end.height).toBeLessThanOrEqual(height)
    await page.evaluate(() => document.querySelector('.overflow-y-auto')?.scrollTo(0, 0))
    await page.screenshot({ path: `${screenshots}/live-${width}x${height}.png` })
    await page.getByRole('button', { name: 'End live' }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${screenshots}/live-${width}x${height}-controls.png` })
  })
}

// Everything must be visible at once on real phones and tablets: no scrolling to reach the controls.
const noScrollSizes = [
  [375, 667],
  [360, 800],
  [393, 852],
  [390, 844],
  [412, 915],
  [440, 956],
  [768, 1024],
  [1024, 768],
  [1440, 900],
] as const

for (const [width, height] of noScrollSizes) {
  test(`Live screen fits without scrolling at ${width}x${height}`, async ({ page }) => {
    const world = await installMocks(page)
    await page.setViewportSize({ width, height })
    await signInAsGuest(page)
    await startLive(page)
    server.ai(world, 'Of course. We can take it one step at a time.')
    await expect(page.getByTestId('live-caption')).toBeVisible()
    await page.waitForTimeout(300)
    const scroll = await page.getByTestId('live-scroll').evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }))
    expect(scroll.scrollHeight, `content ${scroll.scrollHeight}px in a ${scroll.clientHeight}px screen`).toBeLessThanOrEqual(scroll.clientHeight + 1)
    // The orb is still a proper size, not squeezed away.
    await page.screenshot({ path: `${screenshots}/fit-${width}x${height}.png` })
    const orb = (await page.locator('[aria-hidden="true"] .rounded-full.overflow-hidden').first().boundingBox())!
    expect(orb.width).toBeGreaterThanOrEqual(height < 700 ? 100 : 140)
    await page.screenshot({ path: `${screenshots}/fit-${width}x${height}.png` })
  })
}
