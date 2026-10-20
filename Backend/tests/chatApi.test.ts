import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'
import type { Server } from 'node:http'
import { createApp } from '../src/app.js'
import { parseConfig } from '../src/config.js'
import { HttpError } from '../src/errors.js'
import type { ChatTurn, ReplyGenerator } from '../src/gemini.js'
import { toChatError } from '../src/gemini.js'
import { ApiError } from '@google/genai'

const SECRET = 'AIzaSy-TEST-SECRET-KEY-123456'
const ORIGIN = 'http://localhost:5173'
const config = parseConfig({ CORS_ALLOWED_ORIGINS: ORIGIN })

let behaviour: (messages: readonly ChatTurn[], signal?: AbortSignal) => Promise<string> = async () => 'default'
const seen: { messages: readonly ChatTurn[]; signal?: AbortSignal }[] = []
const generator: ReplyGenerator = {
  generateReply: async (messages, options) => {
    seen.push({ messages, signal: options?.signal })
    return behaviour(messages, options?.signal)
  },
}

let server: Server
let base: string

before(async () => {
  server = createApp(config, { gemini: generator }).listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
after(() => {
  server.close()
})

const post = (body: unknown, init: RequestInit = {}) =>
  fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) }, body: typeof body === 'string' ? body : JSON.stringify(body), ...init })

async function quiet<T>(run: () => Promise<T>): Promise<T> {
  const original = console.error
  console.error = () => {}
  try {
    return await run()
  } finally {
    console.error = original
  }
}

test('success: returns {"reply": ...} exactly as the contract says', async () => {
  seen.length = 0
  behaviour = async () => 'The actual Gemini response'
  const res = await post({ messages: [{ role: 'user', content: 'Hello' }] })
  assert.equal(res.status, 200)
  assert.equal(await res.text(), '{"reply":"The actual Gemini response"}')
  assert.deepEqual(seen[0].messages, [{ role: 'user', content: 'Hello' }])
})

test('previous turns reach the generator in order, with the latest message last', async () => {
  seen.length = 0
  behaviour = async () => 'ok'
  await post({ messages: [{ role: 'user', content: 'A' }, { role: 'assistant', content: 'B' }, { role: 'user', content: 'C' }] })
  assert.deepEqual(seen[0].messages.map((m) => `${m.role}:${m.content}`), ['user:A', 'assistant:B', 'user:C'])
})

test('invalid requests: 400 invalid_request in the shared error format, generator not called', async () => {
  seen.length = 0
  const bad: unknown[] = [
    {},
    { messages: [] },
    { messages: [{ role: 'user', content: '' }] },
    { messages: [{ role: 'system', content: 'x' }] },
    { messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] },
    { messages: 'nope' },
  ]
  for (const body of bad) {
    const res = await post(body)
    const json = (await res.json()) as { error: { code: string; message: string } }
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.equal(json.error.code, 'invalid_request')
    assert.ok(json.error.message.length > 0)
  }
  assert.equal(seen.length, 0)
})

test('malformed JSON -> 400 invalid_json; body over 100 kb -> 413 payload_too_large', async () => {
  let res = await post('{oops')
  assert.equal(res.status, 400)
  assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'invalid_json')

  res = await post({ messages: [{ role: 'user', content: 'x'.repeat(200_000) }] })
  assert.equal(res.status, 413)
  assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'payload_too_large')
})

test('request without a JSON content type is rejected as invalid_request', async () => {
  const res = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'hello' })
  assert.equal(res.status, 400)
  assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'invalid_request')
})

test('GET /api/chat is a JSON 404, not a reply', async () => {
  const res = await fetch(`${base}/api/chat`)
  assert.equal(res.status, 404)
  assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'not_found')
})

test('provider errors become safe JSON errors without the secret or raw provider text', async () => {
  const cases: [HttpError, number, string][] = [
    [toChatError(new ApiError({ status: 429, message: `quota for ${SECRET}` })), 429, 'ai_rate_limited'],
    [toChatError(new ApiError({ status: 403, message: `denied ${SECRET}` })), 502, 'ai_auth_failed'],
    [toChatError(new Error('x'), true), 504, 'ai_timeout'],
    [new HttpError(503, 'ai_not_configured', 'The AI service is not configured on the server.'), 503, 'ai_not_configured'],
  ]
  for (const [error, status, code] of cases) {
    behaviour = async () => {
      throw error
    }
    const res = await quiet(() => post({ messages: [{ role: 'user', content: 'x' }] }))
    const text = await res.text()
    assert.equal(res.status, status)
    assert.equal((JSON.parse(text) as { error: { code: string } }).error.code, code)
    assert.ok(!text.includes(SECRET))
    assert.ok(!/googleapis|stack|\bat /.test(text))
  }
})

test('an unexpected exception inside the generator is a generic 500 with no details', async () => {
  behaviour = async () => {
    throw new Error(`database password=${SECRET} at C:/internal/file.ts`)
  }
  const res = await quiet(() => post({ messages: [{ role: 'user', content: 'x' }] }))
  const text = await res.text()
  assert.equal(res.status, 500)
  assert.equal(text, '{"error":{"code":"internal_error","message":"Internal server error."}}')
})

test('concurrent requests are isolated from each other', async () => {
  behaviour = async (messages) => {
    await new Promise((resolve) => setTimeout(resolve, 20))
    return `last:${messages.at(-1)!.content}|count:${messages.length}`
  }
  const [a, b] = await Promise.all([
    post({ messages: [{ role: 'user', content: 'from A' }] }).then((r) => r.json()),
    post({ messages: [{ role: 'user', content: 'x1' }, { role: 'assistant', content: 'x2' }, { role: 'user', content: 'from B' }] }).then((r) => r.json()),
  ])
  assert.deepEqual(a, { reply: 'last:from A|count:1' })
  assert.deepEqual(b, { reply: 'last:from B|count:3' })
})

test('/api/health still answers while the generator fails, and never calls it', async () => {
  seen.length = 0
  behaviour = async () => {
    throw new Error('Gemini is down')
  }
  const res = await fetch(`${base}/api/health`)
  assert.equal(res.status, 200)
  assert.equal(await res.text(), '{"status":"ok","service":"aichatbot-gemini-backend"}')
  assert.equal(seen.length, 0)
})

test('the browser disconnecting aborts the in-flight generator call', async () => {
  seen.length = 0
  let aborted = false
  behaviour = (_messages, signal) =>
    new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => {
        aborted = true
        reject(new DOMException('aborted', 'AbortError'))
      })
    })
  const controller = new AbortController()
  const request = post({ messages: [{ role: 'user', content: 'slow' }] }, { signal: controller.signal }).catch(() => 'client-aborted')
  await new Promise((resolve) => setTimeout(resolve, 50))
  controller.abort()
  assert.equal(await request, 'client-aborted')
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(aborted, true)
})

test('CORS: preflight for POST /api/chat is allowed for the frontend origin only', async () => {
  const ok = await fetch(`${base}/api/chat`, {
    method: 'OPTIONS',
    headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
  })
  assert.equal(ok.status, 204)
  assert.equal(ok.headers.get('access-control-allow-origin'), ORIGIN)
  assert.match(ok.headers.get('access-control-allow-methods') ?? '', /POST/)

  const denied = await fetch(`${base}/api/chat`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://evil.example', 'Access-Control-Request-Method': 'POST' },
  })
  assert.equal(denied.headers.get('access-control-allow-origin'), null)
})
