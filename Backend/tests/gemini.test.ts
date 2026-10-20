import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApiError, FinishReason, ThinkingLevel } from '@google/genai'
import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai'
import { HttpError } from '../src/errors.js'
import { createGeminiService, extractReply, MAX_OUTPUT_TOKENS, toChatError, toContents } from '../src/gemini.js'
import type { GeminiClient } from '../src/gemini.js'

const SECRET = 'AIzaSy-TEST-SECRET-KEY-123456'
const settings = { model: 'gemini-test-model', apiKey: SECRET }

const textResponse = (text: string) =>
  ({ text, candidates: [{ finishReason: FinishReason.STOP, content: { role: 'model', parts: [{ text }] } }] }) as unknown as GenerateContentResponse

function fakeClient(handler: (params: GenerateContentParameters) => Promise<GenerateContentResponse>) {
  const calls: GenerateContentParameters[] = []
  const client: GeminiClient = {
    models: {
      generateContent: async (params: GenerateContentParameters) => {
        calls.push(params)
        return handler(params)
      },
    },
  }
  return { client, calls }
}

async function quiet<T>(run: () => Promise<T>): Promise<T> {
  const original = console.error
  console.error = () => {}
  try {
    return await run()
  } finally {
    console.error = original
  }
}

// ---- role / history mapping ------------------------------------------------------
test('toContents maps assistant to model and keeps order, text, and one part each', () => {
  const contents = toContents([
    { role: 'user', content: 'Hi' },
    { role: 'assistant', content: 'Hello!' },
    { role: 'user', content: 'Thanks' },
  ])
  assert.deepEqual(contents, [
    { role: 'user', parts: [{ text: 'Hi' }] },
    { role: 'model', parts: [{ text: 'Hello!' }] },
    { role: 'user', parts: [{ text: 'Thanks' }] },
  ])
})

test('the service sends history once, with the latest user message last and exactly once', async () => {
  const { client, calls } = fakeClient(async () => textResponse('ok'))
  const service = createGeminiService(settings, { client })
  await service.generateReply([
    { role: 'user', content: 'first' },
    { role: 'assistant', content: 'reply' },
    { role: 'user', content: 'latest' },
  ])
  assert.equal(calls.length, 1)
  const contents = calls[0].contents as { role: string; parts: { text: string }[] }[]
  assert.deepEqual(contents.map((c) => `${c.role}:${c.parts[0].text}`), ['user:first', 'model:reply', 'user:latest'])
  assert.equal(contents.filter((c) => c.parts[0].text === 'latest').length, 1)
})

test('request parameters: configured model, bounded output, low thinking, no tools, one attempt, abort signal', async () => {
  const { client, calls } = fakeClient(async () => textResponse('ok'))
  await createGeminiService(settings, { client }).generateReply([{ role: 'user', content: 'x' }])
  const [{ model, config }] = calls
  assert.equal(model, 'gemini-test-model')
  assert.equal(config?.maxOutputTokens, MAX_OUTPUT_TOKENS)
  assert.equal(config?.thinkingConfig?.thinkingLevel, ThinkingLevel.LOW)
  assert.equal(config?.tools, undefined)
  assert.equal(config?.httpOptions?.retryOptions?.attempts, 1)
  assert.ok(config?.abortSignal instanceof AbortSignal)
  assert.match(String(config?.systemInstruction), /AI Chat/)
})

test('calls are independent: no state is shared between concurrent conversations', async () => {
  const { client, calls } = fakeClient(async (params) => {
    await new Promise((resolve) => setTimeout(resolve, 15))
    const last = (params.contents as { parts: { text: string }[] }[]).at(-1)!.parts[0].text
    return textResponse(`echo:${last}`)
  })
  const service = createGeminiService(settings, { client })
  const [a, b] = await Promise.all([
    service.generateReply([{ role: 'user', content: 'user A secret' }]),
    service.generateReply([
      { role: 'user', content: 'user B one' },
      { role: 'assistant', content: 'user B reply' },
      { role: 'user', content: 'user B two' },
    ]),
  ])
  assert.equal(a, 'echo:user A secret')
  assert.equal(b, 'echo:user B two')
  const serialised = calls.map((c) => JSON.stringify(c.contents))
  assert.ok(serialised.every((s) => !(s.includes('user A') && s.includes('user B'))), 'histories were mixed')
})

// ---- not configured / lazy ----------------------------------------------------------
test('without an API key: 503 ai_not_configured and the SDK is never called', async () => {
  const { client, calls } = fakeClient(async () => textResponse('should not happen'))
  const service = createGeminiService({ model: 'm' }, { client })
  await assert.rejects(
    () => service.generateReply([{ role: 'user', content: 'x' }]),
    (e: unknown) => e instanceof HttpError && e.status === 503 && e.code === 'ai_not_configured',
  )
  assert.equal(calls.length, 0)
})

test('creating the service makes no Gemini call', () => {
  const { calls } = fakeClient(async () => textResponse('x'))
  createGeminiService(settings)
  assert.equal(calls.length, 0)
})

// ---- blocked / empty responses -----------------------------------------------------------
test('extractReply returns trimmed text', () => {
  assert.equal(extractReply(textResponse('  hello \n')), 'hello')
})

test('prompt blocked by Gemini -> 422 ai_response_blocked', () => {
  const response = { text: undefined, promptFeedback: { blockReason: 'SAFETY' }, candidates: undefined } as unknown as GenerateContentResponse
  assert.throws(() => extractReply(response), (e: unknown) => e instanceof HttpError && e.status === 422 && e.code === 'ai_response_blocked')
})

test('reply stopped by a safety finish reason with no text -> 422 ai_response_blocked', () => {
  for (const reason of [FinishReason.SAFETY, FinishReason.PROHIBITED_CONTENT, FinishReason.RECITATION]) {
    const response = { text: undefined, candidates: [{ finishReason: reason }] } as unknown as GenerateContentResponse
    assert.throws(() => extractReply(response), (e: unknown) => e instanceof HttpError && e.code === 'ai_response_blocked', reason)
  }
})

test('empty or whitespace-only reply -> 502 ai_empty_response, never a fake reply', () => {
  for (const response of [
    { text: undefined, candidates: [{ finishReason: FinishReason.STOP }] },
    { text: '   ', candidates: [{ finishReason: FinishReason.STOP }] },
    { text: undefined, candidates: [{ finishReason: FinishReason.MAX_TOKENS }] },
    { text: undefined, candidates: [] },
    { text: undefined },
  ]) {
    assert.throws(
      () => extractReply(response as unknown as GenerateContentResponse),
      (e: unknown) => e instanceof HttpError && e.status === 502 && e.code === 'ai_empty_response',
    )
  }
})

// ---- upstream error mapping ----------------------------------------------------------------
const sdkError = (status: number, message = 'provider detail') => new ApiError({ status, message })

test('upstream errors map to safe client errors', () => {
  const cases: [Error, number, string][] = [
    [sdkError(401), 502, 'ai_auth_failed'],
    [sdkError(403), 502, 'ai_auth_failed'],
    [sdkError(400, 'API key not valid. Please pass a valid API key.'), 502, 'ai_auth_failed'],
    [sdkError(400, '{"error":{"status":"INVALID_ARGUMENT","message":"bad field"}}'), 502, 'ai_error'],
    [sdkError(404), 502, 'ai_model_unavailable'],
    [sdkError(429), 429, 'ai_rate_limited'],
    [sdkError(408), 504, 'ai_timeout'],
    [sdkError(504), 504, 'ai_timeout'],
    [sdkError(500), 502, 'ai_unavailable'],
    [sdkError(503), 502, 'ai_unavailable'],
    [new TypeError('fetch failed'), 502, 'ai_unavailable'],
  ]
  for (const [error, status, code] of cases) {
    const mapped = toChatError(error)
    assert.equal(mapped.status, status, `${error.message}`)
    assert.equal(mapped.code, code, `${error.message}`)
  }
  assert.equal(toChatError(new Error('x'), true).code, 'ai_timeout')
})

test('mapped errors never contain provider text, secrets, or stack traces', () => {
  const leaky = sdkError(500, `upstream blew up key=${SECRET} at https://generativelanguage.googleapis.com/v1/models/x?key=${SECRET}`)
  const mapped = toChatError(leaky)
  const shown = JSON.stringify({ code: mapped.code, message: mapped.message, status: mapped.status })
  assert.ok(!shown.includes(SECRET))
  assert.ok(!/googleapis|blew up|\bat /.test(shown))
})

test('service converts upstream failures, logs no secret, and never returns a fake reply', async () => {
  const logged: string[] = []
  const original = console.error
  console.error = (...args: unknown[]) => logged.push(args.map(String).join(' '))
  try {
    const { client } = fakeClient(async () => {
      throw sdkError(429, `quota exceeded for key ${SECRET}`)
    })
    await assert.rejects(
      () => createGeminiService(settings, { client }).generateReply([{ role: 'user', content: 'x' }]),
      (e: unknown) => e instanceof HttpError && e.status === 429 && e.code === 'ai_rate_limited',
    )
  } finally {
    console.error = original
  }
  assert.equal(logged.length, 1)
  assert.ok(!logged[0].includes(SECRET), 'log line leaked the key')
  assert.match(logged[0], /\[model gemini-test-model\]: ai_rate_limited \{"httpStatus":429\}/)
})

// ---- timeout and cancellation -----------------------------------------------------------------
test('timeout: a slow Gemini call is aborted and reported as 504 ai_timeout', async () => {
  const { client } = fakeClient(
    (params) =>
      new Promise((_resolve, reject) => {
        params.config?.abortSignal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      }),
  )
  const service = createGeminiService(settings, { client, timeoutMs: 40 })
  await quiet(() =>
    assert.rejects(
      () => service.generateReply([{ role: 'user', content: 'x' }]),
      (e: unknown) => e instanceof HttpError && e.status === 504 && e.code === 'ai_timeout',
    ),
  )
})

test('caller cancellation aborts the Gemini request and is not reported as an error response', async () => {
  let sdkSignal: AbortSignal | undefined
  const { client } = fakeClient(
    (params) =>
      new Promise((_resolve, reject) => {
        sdkSignal = params.config?.abortSignal
        sdkSignal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      }),
  )
  const controller = new AbortController()
  const pending = createGeminiService(settings, { client }).generateReply([{ role: 'user', content: 'x' }], { signal: controller.signal })
  setTimeout(() => controller.abort(), 20)
  await assert.rejects(pending, (e: unknown) => !(e instanceof HttpError) && (e as Error).name === 'AbortError')
  assert.equal(sdkSignal?.aborted, true)
})
