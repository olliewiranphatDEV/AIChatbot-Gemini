import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApiError } from '../../src/api/apiError.ts'
import type { MicCapture } from '../../src/voice/controller.ts'
import { createDictationController } from '../../src/voice/dictation.ts'
import type { DictationDeps, DictationState } from '../../src/voice/dictation.ts'

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
const second = () => new Int16Array(16_000).fill(5) // one second of audio

function setup(overrides: Partial<DictationDeps> = {}) {
  const log = { micStarted: 0, micStopped: 0, transcribed: [] as Uint8Array[], aborted: 0 }
  const states: DictationState[] = []
  const texts: string[] = []
  let feed: (pcm: Int16Array) => void = () => {}
  let now = 1_000_000
  const deps: DictationDeps = {
    checkSupport: () => null,
    startCapture: async (onChunk) => {
      log.micStarted += 1
      feed = onChunk
      const mic: MicCapture = { setMuted: () => {}, stop: () => { log.micStopped += 1 } }
      return mic
    },
    transcribe: async (wav, signal) => {
      log.transcribed.push(wav)
      signal.addEventListener('abort', () => { log.aborted += 1 })
      return 'สวัสดีครับ'
    },
    now: () => now,
    ...overrides,
  }
  const controller = createDictationController(deps, { state: (s) => states.push(s), text: (t) => texts.push(t) })
  return { controller, log, states, texts, feed: (pcm: Int16Array) => feed(pcm), last: () => states.at(-1), advance: (ms: number) => { now += ms } }
}

test('start records first; nothing is transcribed (or sent anywhere) until End is pressed', async () => {
  const w = setup()
  w.controller.start()
  await tick()
  w.feed(second())
  w.feed(second())
  assert.equal(w.log.micStarted, 1)
  assert.equal(w.log.transcribed.length, 0)
  assert.deepEqual(w.last(), { phase: 'recording', seconds: 2 })
  assert.deepEqual(w.texts, [])
})

test('End releases the microphone at once, transcribes the recording, and hands the text over for review', async () => {
  const w = setup()
  w.controller.start()
  await tick()
  w.feed(second())
  w.controller.stop()
  assert.equal(w.log.micStopped, 1, 'the microphone is off before the transcription finishes')
  assert.equal(w.last()?.phase, 'transcribing')
  await tick()
  assert.equal(w.log.transcribed.length, 1)
  assert.equal(w.log.transcribed[0].length, 44 + 16_000 * 2, 'a WAV with exactly the recorded audio')
  assert.deepEqual(w.texts, ['สวัสดีครับ'])
  assert.deepEqual(w.last(), { phase: 'idle' })
  assert.ok(!w.controller.isBusy())
})

test('Cancel while recording discards the audio and releases the microphone; nothing is sent', async () => {
  const w = setup()
  w.controller.start()
  await tick()
  w.feed(second())
  w.controller.cancel()
  assert.equal(w.log.micStopped, 1)
  assert.equal(w.log.transcribed.length, 0)
  assert.deepEqual(w.last(), { phase: 'idle' })
  w.feed(second()) // late audio is ignored
  w.controller.stop()
  assert.equal(w.log.transcribed.length, 0)
})

test('Cancel while transcribing aborts the request and ignores its late answer', async () => {
  let finish!: (text: string) => void
  const w = setup({ transcribe: (_wav, signal) => new Promise<string>((resolve) => { signal.addEventListener('abort', () => {}); finish = resolve }) })
  w.controller.start()
  await tick()
  w.feed(second())
  w.controller.stop()
  w.controller.cancel()
  finish('too late')
  await tick()
  assert.deepEqual(w.texts, [])
  assert.deepEqual(w.last(), { phase: 'idle' })
})

test('a refused microphone shows a clear message, keeps nothing, and sends nothing', async () => {
  const w = setup({ startCapture: async () => { throw Object.assign(new Error('x'), { name: 'NotAllowedError' }) } })
  w.controller.start()
  await tick()
  const state = w.last()
  assert.equal(state?.phase, 'error')
  assert.match(state?.phase === 'error' ? state.message : '', /Microphone access was blocked/)
  assert.equal(w.log.transcribed.length, 0)
  assert.ok(!w.controller.isBusy())
})

test('unsupported or insecure pages fail before the microphone is touched', async () => {
  const w = setup({ checkSupport: () => ({ kind: 'insecure-context', message: 'Voice needs a secure connection.' }) })
  w.controller.start()
  await tick()
  assert.equal(w.log.micStarted, 0)
  assert.equal(w.last()?.phase, 'error')
})

test('a recording that is too short is not sent', async () => {
  const w = setup()
  w.controller.start()
  await tick()
  w.feed(new Int16Array(1600)) // 0.1 s
  w.controller.stop()
  assert.equal(w.log.transcribed.length, 0)
  const state = w.last()
  assert.ok(state?.phase === 'error' && !state.canRetry && /too short/.test(state.message))
  assert.equal(w.log.micStopped, 1)
})

test('recording stops by itself at the 60 second limit and is transcribed', async () => {
  const w = setup()
  w.controller.start()
  await tick()
  for (let i = 0; i < 70; i += 1) w.feed(second())
  await tick()
  assert.equal(w.log.micStopped, 1)
  assert.equal(w.log.transcribed.length, 1)
  assert.equal(w.log.transcribed[0].length, 44 + 60 * 16_000 * 2, 'exactly 60 seconds, later audio dropped')
})

test('a failed transcription keeps the recording and Try again sends the same audio', async () => {
  let attempts = 0
  const w = setup({
    transcribe: async (wav) => {
      attempts += 1
      w.log.transcribed.push(wav)
      if (attempts === 1) throw new ApiError('network', 'Could not reach the backend.')
      return 'second try'
    },
  })
  w.controller.start()
  await tick()
  w.feed(second())
  w.controller.stop()
  await tick()
  const failed = w.last()
  assert.ok(failed?.phase === 'error' && failed.canRetry)
  assert.deepEqual(w.texts, [])
  w.controller.retry()
  await tick()
  assert.deepEqual(w.texts, ['second try'])
  assert.equal(w.log.transcribed[0], w.log.transcribed[1], 'the very same recording is sent again')
  assert.equal(w.log.micStarted, 1, 'no new recording is needed')
})

test('no-speech is final: the message is shown and Try again is not offered', async () => {
  let calls = 0
  const w = setup({ transcribe: async () => { calls += 1; throw new ApiError('http', 'No speech was detected.', { status: 422, serverCode: 'no_speech' }) } })
  w.controller.start()
  await tick()
  w.feed(second())
  w.controller.stop()
  await tick()
  const state = w.last()
  assert.ok(state?.phase === 'error' && !state.canRetry && state.message === 'No speech was detected.')
  w.controller.retry() // nothing kept
  await tick()
  assert.equal(calls, 1)
})

test('after a rate limit, Try again waits for the provider retry time without calling the backend', async () => {
  let calls = 0
  const w = setup({ transcribe: async () => { calls += 1; throw new ApiError('http', 'rate limited', { status: 429, serverCode: 'ai_rate_limited', retryAfterSeconds: 10 }) } })
  w.controller.start()
  await tick()
  w.feed(second())
  w.controller.stop()
  await tick()
  w.controller.retry()
  await tick()
  assert.equal(calls, 1, 'no request inside the retry window')
  const waiting = w.last()
  assert.ok(waiting?.phase === 'error' && /try again in about 10 seconds/.test(waiting.message))
  w.advance(10_500)
  w.controller.retry()
  await tick()
  assert.equal(calls, 2)
})

test('a second start while recording or transcribing is ignored', async () => {
  const w = setup()
  w.controller.start()
  w.controller.start()
  await tick()
  assert.equal(w.log.micStarted, 1)
  w.feed(second())
  w.controller.stop()
  w.controller.start()
  await tick()
  assert.equal(w.log.micStarted, 1)
})

test('cancelled while the permission prompt is open: the microphone that arrives late is released', async () => {
  let grant!: (mic: MicCapture) => void
  let stopped = 0
  const w = setup({ startCapture: () => new Promise<MicCapture>((resolve) => { grant = resolve }) })
  w.controller.start()
  w.controller.cancel()
  grant({ setMuted: () => {}, stop: () => { stopped += 1 } })
  await tick()
  assert.equal(stopped, 1)
  assert.deepEqual(w.last(), { phase: 'idle' })
})

test('pressing End before the microphone is ready cancels instead of sending an empty recording', async () => {
  let grant!: (mic: MicCapture) => void
  let stopped = 0
  const w = setup({ startCapture: () => new Promise<MicCapture>((resolve) => { grant = resolve }) })
  w.controller.start()
  w.controller.stop()
  grant({ setMuted: () => {}, stop: () => { stopped += 1 } })
  await tick()
  assert.equal(stopped, 1)
  assert.equal(w.log.transcribed.length, 0)
})

test('dispose (the page going away) releases the microphone, aborts the request and reports nothing', async () => {
  const w = setup()
  w.controller.start()
  await tick()
  w.feed(second())
  const before = w.states.length
  w.controller.dispose()
  assert.equal(w.log.micStopped, 1)
  w.feed(second())
  assert.equal(w.states.length, before)
})
