import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { after, before, test } from 'node:test'
import { ApiError, Modality } from '@google/genai'
import type { CreateAuthTokenParameters } from '@google/genai'
import { createApp } from '../src/app.js'
import { parseConfig } from '../src/config.js'
import { HttpError } from '../src/errors.js'
import { buildLiveConstraints, createLiveTokenService, LIVE_TOKEN_START_WINDOW_MS, LIVE_TOKEN_TTL_MS, VOICE_SYSTEM_INSTRUCTION } from '../src/live.js'
import type { AuthTokensClient, LiveTokenIssuer } from '../src/live.js'
import { createRateLimiter } from '../src/rateLimit.js'

const SECRET = 'AIzaSy-TEST-SECRET-KEY-123456'
const TOKEN = 'auth_tokens/ephemeral-test-token-value'
const settings = { model: 'text-model-x', liveModel: 'live-model-x', apiKey: SECRET }

function fakeClient(handler: (params: CreateAuthTokenParameters) => Promise<{ name?: string }>) {
  const calls: CreateAuthTokenParameters[] = []
  const client = {
    authTokens: {
      create: async (params: CreateAuthTokenParameters) => {
        calls.push(params)
        return handler(params)
      },
    },
  } as unknown as AuthTokensClient
  return { client, calls }
}

async function captureErrors<T>(run: () => Promise<T>): Promise<{ result: T; logged: string[] }> {
  const logged: string[] = []
  const original = console.error
  console.error = (...args: unknown[]) => logged.push(args.map(String).join(' '))
  try {
    return { result: await run(), logged }
  } finally {
    console.error = original
  }
}

// ---- token service -------------------------------------------------------------------
test('the token is constrained to the live model, audio output, transcription and the server-side instruction', async () => {
  const { client, calls } = fakeClient(async () => ({ name: TOKEN }))
  await createLiveTokenService(settings, { client }).createToken()
  const constraints = calls[0].config?.liveConnectConstraints
  assert.equal(constraints?.model, 'live-model-x', 'must use the live model, not the text model')
  assert.deepEqual(constraints?.config?.responseModalities, [Modality.AUDIO])
  assert.deepEqual(constraints?.config?.inputAudioTranscription, {})
  assert.deepEqual(constraints?.config?.outputAudioTranscription, {})
  assert.equal(constraints?.config?.systemInstruction, VOICE_SYSTEM_INSTRUCTION)
  assert.deepEqual(constraints?.config?.contextWindowCompression, { slidingWindow: {} })
  assert.equal(constraints?.config?.tools, undefined)
  assert.equal(constraints?.config?.thinkingConfig, undefined, 'gemini-3.8-live does not support thinking settings')
})

test('buildLiveConstraints is pure and uses the model it is given', () => {
  assert.equal(buildLiveConstraints('another-live')?.model, 'another-live')
})

test('single use, short expiry, short window to start the session, one upstream attempt', async () => {
  const t0 = Date.UTC(2026, 9, 19, 12, 0, 0)
  const { client, calls } = fakeClient(async () => ({ name: TOKEN }))
  const result = await createLiveTokenService(settings, { client, now: () => t0 }).createToken()
  const config = calls[0].config
  assert.equal(config?.uses, 1)
  assert.equal(config?.expireTime, new Date(t0 + LIVE_TOKEN_TTL_MS).toISOString())
  assert.equal(config?.newSessionExpireTime, new Date(t0 + LIVE_TOKEN_START_WINDOW_MS).toISOString())
  assert.ok(LIVE_TOKEN_TTL_MS <= 20 * 60_000 && LIVE_TOKEN_START_WINDOW_MS <= 60_000)
  assert.equal(config?.httpOptions?.retryOptions?.attempts, 1)
  assert.deepEqual(result, { token: TOKEN, model: 'live-model-x', expiresAt: config?.expireTime, newSessionExpiresAt: config?.newSessionExpireTime })
})

test('the result contains the ephemeral token but never the permanent API key', async () => {
  const { client } = fakeClient(async () => ({ name: TOKEN }))
  const result = await createLiveTokenService(settings, { client }).createToken()
  assert.ok(!JSON.stringify(result).includes(SECRET))
})

test('every call creates its own token and sends nothing from a previous caller', async () => {
  let n = 0
  const { client, calls } = fakeClient(async () => ({ name: `auth_tokens/t${(n += 1)}` }))
  const service = createLiveTokenService(settings, { client })
  const [a, b] = await Promise.all([service.createToken(), service.createToken()])
  assert.notEqual(a.token, b.token)
  assert.equal(calls.length, 2)
})

test('without an API key: 503 ai_not_configured and Gemini is never called', async () => {
  const { client, calls } = fakeClient(async () => ({ name: TOKEN }))
  await assert.rejects(
    () => createLiveTokenService({ model: 'm', liveModel: 'l' }, { client }).createToken(),
    (e: unknown) => e instanceof HttpError && e.status === 503 && e.code === 'ai_not_configured',
  )
  assert.equal(calls.length, 0)
})

test('creating the service makes no Gemini call', () => {
  const { calls } = fakeClient(async () => ({ name: TOKEN }))
  createLiveTokenService(settings)
  assert.equal(calls.length, 0)
})

test('upstream failures become safe errors; the log names the model and allowlisted fields only', async () => {
  const body = { error: { status: 'RESOURCE_EXHAUSTED', message: `quota for ${SECRET}`, details: [{ '@type': 'x.RetryInfo', retryDelay: '12s' }] } }
  const { client } = fakeClient(async () => {
    throw new ApiError({ status: 429, message: JSON.stringify(body) })
  })
  const { logged } = await captureErrors(async () => {
    await assert.rejects(
      () => createLiveTokenService(settings, { client }).createToken(),
      (e: unknown) => e instanceof HttpError && e.status === 429 && e.code === 'ai_rate_limited' && e.retryAfterSeconds === 12,
    )
  })
  assert.equal(logged.length, 1)
  assert.match(logged[0], /live token failed \[model live-model-x\]: ai_rate_limited/)
  assert.ok(!logged[0].includes(SECRET))
})

test('an empty token from Gemini is an error, never a fake success', async () => {
  const { client } = fakeClient(async () => ({}))
  await captureErrors(async () => {
    await assert.rejects(() => createLiveTokenService(settings, { client }).createToken(), (e: unknown) => e instanceof HttpError && e.status === 502)
  })
})

// ---- HTTP endpoint ---------------------------------------------------------------------
const config = parseConfig({ CORS_ALLOWED_ORIGINS: 'http://localhost:5173' })
let issuer: LiveTokenIssuer = { createToken: async () => ({ token: TOKEN, model: 'live-model-x', expiresAt: 'e', newSessionExpiresAt: 'n' }) }
let issued = 0
let server: Server
let base: string

before(async () => {
  const counting: LiveTokenIssuer = { createToken: () => { issued += 1; return issuer.createToken() } }
  const limiter = createRateLimiter({ windowMs: 60_000, maxPerClient: 3, maxTotal: 100 })
  server = createApp(config, { liveTokens: counting, liveTokenLimiter: limiter }).listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
after(() => {
  server.close()
})

test('POST /api/live-token returns the token and forbids caching', async () => {
  const res = await fetch(`${base}/api/live-token`, { method: 'POST' })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { token: TOKEN, model: 'live-model-x', expiresAt: 'e', newSessionExpiresAt: 'n' })
  assert.match(res.headers.get('cache-control') ?? '', /no-store/)
  assert.equal(res.headers.get('pragma'), 'no-cache')
})

test('error responses from the token endpoint use the shared JSON shape without secrets', async () => {
  issuer = { createToken: async () => { throw new HttpError(503, 'ai_not_configured', 'The AI service is not configured on the server.') } }
  const res = await fetch(`${base}/api/live-token`, { method: 'POST' })
  assert.equal(res.status, 503)
  assert.deepEqual(await res.json(), { error: { code: 'ai_not_configured', message: 'The AI service is not configured on the server.' } })
})

test('a provider rate limit passes its retry delay to the browser as Retry-After', async () => {
  issuer = { createToken: async () => { throw new HttpError(429, 'ai_rate_limited', 'The AI service is rate limited right now. Please wait about 7 seconds and try again.', { retryAfterSeconds: 7 }) } }
  // earlier tests in this file already used the per-client budget, so use a second app for a clean limiter
  const app = createApp(config, { liveTokens: issuer }).listen(0, '127.0.0.1')
  await new Promise((resolve) => app.once('listening', resolve))
  try {
    const url = `http://127.0.0.1:${(app.address() as AddressInfo).port}/api/live-token`
    const res = await fetch(url, { method: 'POST' })
    assert.equal(res.status, 429)
    assert.equal(res.headers.get('retry-after'), '7')
    assert.equal(((await res.json()) as { error: { retryAfterSeconds: number } }).error.retryAfterSeconds, 7)
  } finally {
    app.close()
  }
})

test('requests beyond the throttle get 429 rate_limited and never reach Gemini', async () => {
  issuer = { createToken: async () => ({ token: TOKEN, model: 'm', expiresAt: 'e', newSessionExpiresAt: 'n' }) }
  const app = createApp(config, { liveTokens: { createToken: () => { issued += 1; return issuer.createToken() } }, liveTokenLimiter: createRateLimiter({ windowMs: 60_000, maxPerClient: 2, maxTotal: 100 }) }).listen(0, '127.0.0.1')
  await new Promise((resolve) => app.once('listening', resolve))
  try {
    const url = `http://127.0.0.1:${(app.address() as AddressInfo).port}/api/live-token`
    const before = issued
    assert.equal((await fetch(url, { method: 'POST' })).status, 200)
    assert.equal((await fetch(url, { method: 'POST' })).status, 200)
    const limited = await fetch(url, { method: 'POST' })
    assert.equal(limited.status, 429)
    assert.ok(Number(limited.headers.get('retry-after')) >= 1)
    const body = (await limited.json()) as { error: { code: string; retryAfterSeconds: number } }
    assert.equal(body.error.code, 'rate_limited')
    assert.ok(body.error.retryAfterSeconds >= 1)
    assert.equal(issued - before, 2, 'throttled requests must not create tokens')
  } finally {
    app.close()
  }
})

test('GET /api/live-token is a JSON 404 and does not issue a token', async () => {
  const before = issued
  const res = await fetch(`${base}/api/live-token`)
  assert.equal(res.status, 404)
  assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'not_found')
  assert.equal(issued, before)
})

test('the frontend origin may call the endpoint (preflight); other origins may not', async () => {
  const ok = await fetch(`${base}/api/live-token`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' } })
  assert.equal(ok.status, 204)
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  const denied = await fetch(`${base}/api/live-token`, { method: 'OPTIONS', headers: { Origin: 'http://evil.example', 'Access-Control-Request-Method': 'POST' } })
  assert.equal(denied.headers.get('access-control-allow-origin'), null)
})

test('/api/health never touches the token service', async () => {
  const before = issued
  const res = await fetch(`${base}/api/health`)
  assert.equal(res.status, 200)
  assert.equal(issued, before)
})
