import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApiError } from '../../src/api/apiError.ts'
import { pcm16ToBase64 } from '../../src/voice/audio.ts'
import { createVoiceController } from '../../src/voice/controller.ts'
import type { AudioPlayer, LiveCallbacks, LiveConnection, MicCapture, VoiceDeps } from '../../src/voice/controller.ts'
import { checkVoiceSupport, describeVoiceError } from '../../src/voice/errors.ts'
import { describeVoice, initialVoiceState, voiceReducer } from '../../src/voice/state.ts'
import type { VoiceAction } from '../../src/voice/state.ts'
import type { TranscriptEvent } from '../../src/voice/transcript.ts'

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

// A scripted world: fake microphone, speaker and Live connection, with counters for what was opened and closed.
function setup(overrides: Partial<VoiceDeps> = {}) {
  const log = {
    micStarted: 0, micStopped: 0, playersMade: 0, playersClosed: 0, playerStops: 0, tokens: 0, connects: 0, connectionsClosed: 0,
    sent: [] as string[], audioEnds: 0, enqueued: 0, muteCalls: [] as boolean[], history: [] as unknown[],
  }
  const actions: VoiceAction[] = []
  const transcript: TranscriptEvent[] = []
  let onChunk: (pcm: Int16Array) => void = () => {}
  let callbacks!: LiveCallbacks
  let onPlaying: (playing: boolean) => void = () => {}
  let now = 1_000_000

  const deps: VoiceDeps = {
    checkSupport: () => null,
    startCapture: async (chunk) => {
      log.micStarted += 1
      onChunk = chunk
      const mic: MicCapture = { setMuted: (m) => log.muteCalls.push(m), stop: () => { log.micStopped += 1 } }
      return mic
    },
    createPlayer: (playing) => {
      log.playersMade += 1
      onPlaying = playing
      const player: AudioPlayer = { enqueue: () => { log.enqueued += 1 }, stop: () => { log.playerStops += 1 }, close: () => { log.playersClosed += 1 } }
      return player
    },
    requestToken: async () => {
      log.tokens += 1
      return { token: 'tok', model: 'live-model' }
    },
    connect: async (params) => {
      log.connects += 1
      callbacks = params.callbacks
      log.history.push(params.history)
      const connection: LiveConnection = {
        sendAudio: (b64) => { log.sent.push(b64) },
        sendAudioEnd: () => { log.audioEnds += 1 },
        close: () => { log.connectionsClosed += 1 },
      }
      return connection
    },
    now: () => now,
    ...overrides,
  }
  const controller = createVoiceController(deps, { dispatch: (a) => actions.push(a), transcript: (e) => transcript.push(e) })
  const status = () => describeVoice(actions.reduce(voiceReducer, initialVoiceState))
  return { controller, log, actions, transcript, status, chunk: (pcm: Int16Array) => onChunk(pcm), cb: () => callbacks, playing: (p: boolean) => onPlaying(p), advance: (ms: number) => { now += ms } }
}

const pcm = Int16Array.from([100, -100, 200])
const connectedWorld = async (history: Parameters<ReturnType<typeof setup>['controller']['start']>[0] = []) => {
  const w = setup()
  w.controller.start(history)
  await tick()
  return w
}

test('starting asks for the microphone, then a token, then connects with the completed history', async () => {
  const history = [{ role: 'user' as const, text: 'q' }, { role: 'model' as const, text: 'a' }]
  const w = await connectedWorld(history)
  assert.equal(w.log.micStarted, 1)
  assert.equal(w.log.tokens, 1)
  assert.deepEqual(w.log.history[0], history)
  assert.equal(w.status(), 'listening')
})

test('microphone audio is sent as base64 PCM16 and stops while muted; unmuting resumes it', async () => {
  const w = await connectedWorld()
  w.chunk(pcm)
  assert.deepEqual(w.log.sent, [pcm16ToBase64(pcm)])
  w.controller.mute()
  assert.equal(w.status(), 'muted')
  assert.deepEqual(w.log.muteCalls, [true])
  assert.equal(w.log.audioEnds, 1, 'the paused stream is flushed')
  w.chunk(pcm)
  assert.equal(w.log.sent.length, 1, 'nothing is transmitted while muted')
  w.controller.unmute()
  assert.equal(w.status(), 'listening')
  w.chunk(pcm)
  assert.equal(w.log.sent.length, 2)
})

test('ending releases the microphone, speaker and socket, and later audio goes nowhere', async () => {
  const w = await connectedWorld()
  w.controller.end()
  assert.deepEqual([w.log.micStopped, w.log.playersClosed, w.log.connectionsClosed], [1, 1, 1])
  assert.equal(w.status(), 'ended')
  assert.ok(!w.controller.isBusy())
  w.chunk(pcm)
  w.cb().onAudio(pcm16ToBase64(pcm))
  w.cb().onOutputText('late text')
  assert.equal(w.log.sent.length, 0)
  assert.equal(w.log.enqueued, 0)
  assert.ok(!w.transcript.some((e) => e.type === 'output'), 'no transcript after the session ended')
  assert.deepEqual(w.transcript.at(-1), { type: 'close' })
  w.controller.end() // ending twice is harmless
  assert.deepEqual([w.log.micStopped, w.log.connectionsClosed], [1, 1])
})

test('a second start while a session exists is ignored: one microphone, one token, one socket', async () => {
  const w = await connectedWorld()
  w.controller.start([])
  w.controller.start([])
  await tick()
  assert.deepEqual([w.log.micStarted, w.log.tokens, w.log.connects], [1, 1, 1])
})

test('a refused microphone shows a clear error and never spends a token', async () => {
  const w = setup({ startCapture: async () => { throw Object.assign(new Error('denied'), { name: 'NotAllowedError' }) } })
  w.controller.start([])
  await tick()
  assert.equal(w.status(), 'error')
  const failure = w.actions.find((a) => a.type === 'fail')
  assert.equal(failure?.type === 'fail' && failure.error.kind, 'permission-denied')
  assert.equal(w.log.tokens, 0)
  assert.equal(w.log.connects, 0)
  assert.ok(!w.controller.isBusy())
})

test('unsupported or insecure pages fail before touching the microphone', async () => {
  const w = setup({ checkSupport: () => checkVoiceSupport({ isSecureContext: false, hasGetUserMedia: false, hasAudioWorklet: true, hasWebSocket: true }) })
  w.controller.start([])
  await tick()
  const failure = w.actions.find((a) => a.type === 'fail')
  assert.equal(failure?.type === 'fail' && failure.error.kind, 'insecure-context')
  assert.equal(w.log.micStarted, 0)
})

test('ending during setup still releases a microphone that arrives late, and never connects', async () => {
  let release!: (mic: MicCapture) => void
  let stopped = 0
  const w = setup({ startCapture: () => new Promise<MicCapture>((resolve) => { release = resolve }) })
  w.controller.start([])
  w.controller.end()
  release({ setMuted: () => {}, stop: () => { stopped += 1 } })
  await tick()
  assert.equal(stopped, 1)
  assert.equal(w.log.tokens, 0)
  assert.equal(w.log.connects, 0)
  assert.equal(w.status(), 'ended')
})

test('ending while the connection is opening closes it when it arrives', async () => {
  let open!: (c: LiveConnection) => void
  let closed = 0
  const w = setup({ connect: () => new Promise<LiveConnection>((resolve) => { open = resolve }) })
  w.controller.start([])
  await tick()
  w.controller.end()
  open({ sendAudio: () => {}, sendAudioEnd: () => {}, close: () => { closed += 1 } })
  await tick()
  assert.equal(closed, 1)
  assert.equal(w.log.micStopped, 1)
  assert.ok(!w.actions.some((a) => a.type === 'connected'))
})

test('a token failure releases the microphone, shows the backend message and is not retried', async () => {
  const limited = new ApiError('http', 'The AI service is rate limited right now. Please wait about 9 seconds and try again.', { status: 429, retryAfterSeconds: 9 })
  let calls = 0
  const w = setup({ requestToken: async () => { calls += 1; throw limited } })
  w.controller.start([])
  await tick()
  assert.equal(w.status(), 'error')
  assert.equal(w.log.micStopped, 1)
  assert.equal(calls, 1)
  const failure = w.actions.find((a) => a.type === 'fail')
  assert.equal(failure?.type === 'fail' && failure.error.message, limited.message)
})

test('after a rate limit, a new start waits for the retry time without calling the backend', async () => {
  let calls = 0
  const limited = new ApiError('http', 'rate limited', { status: 429, retryAfterSeconds: 10 })
  const w = setup({ requestToken: async () => { calls += 1; throw limited } })
  w.controller.start([])
  await tick()
  w.controller.start([])
  await tick()
  assert.equal(calls, 1, 'no second request inside the retry window')
  assert.equal(w.log.micStarted, 1)
  const last = w.actions.filter((a) => a.type === 'fail').at(-1)
  assert.match(last?.type === 'fail' ? last.error.message : '', /try again in about 10 seconds/)
  w.advance(10_500)
  w.controller.start([])
  await tick()
  assert.equal(calls, 2, 'allowed again once the delay has passed')
})

test('an unexpected close ends the session, releases everything, keeps text, and does not reconnect by itself', async () => {
  const w = await connectedWorld()
  w.cb().onClosed()
  await tick()
  assert.equal(w.status(), 'error')
  assert.deepEqual([w.log.micStopped, w.log.playersClosed, w.log.connectionsClosed], [1, 1, 1])
  assert.deepEqual(w.transcript.at(-1), { type: 'close' })
  assert.equal(w.log.connects, 1, 'no automatic reconnect')
  assert.equal(w.log.tokens, 1)
})

test('a close after the server announced goAway is reported as the session time limit', async () => {
  const w = await connectedWorld()
  w.cb().onGoAway()
  w.cb().onClosed()
  const failure = w.actions.find((a) => a.type === 'fail')
  assert.equal(failure?.type === 'fail' && failure.error.kind, 'session-limit')
})

test('after an error the user can start again and gets a fresh, working session', async () => {
  const w = await connectedWorld()
  w.cb().onClosed()
  w.controller.start([])
  await tick()
  assert.equal(w.status(), 'listening')
  assert.deepEqual([w.log.micStarted, w.log.tokens, w.log.connects], [2, 2, 2])
})

test('barge-in: an interruption drops queued speech at once and is reported to the transcript', async () => {
  const w = await connectedWorld()
  w.cb().onAudio(pcm16ToBase64(pcm))
  w.playing(true)
  assert.equal(w.status(), 'speaking')
  w.cb().onInterrupted()
  assert.equal(w.log.playerStops, 1)
  assert.equal(w.status(), 'listening')
  assert.deepEqual(w.transcript.at(-1), { type: 'interrupted' })
})

test('when playback drains the status returns to listening', async () => {
  const w = await connectedWorld()
  w.cb().onAudio(pcm16ToBase64(pcm))
  w.playing(true)
  w.playing(false)
  assert.equal(w.status(), 'listening')
})

test('transcript callbacks are forwarded in order', async () => {
  const w = await connectedWorld()
  w.cb().onInputText('hi')
  w.cb().onOutputText('hello')
  w.cb().onTurnComplete()
  assert.deepEqual(w.transcript, [{ type: 'input', text: 'hi' }, { type: 'output', text: 'hello' }, { type: 'turn-complete' }])
})

test('dispose (the page going away) releases everything and reports nothing to the UI afterwards', async () => {
  const w = await connectedWorld()
  const before = w.actions.length
  w.controller.dispose()
  assert.deepEqual([w.log.micStopped, w.log.playersClosed, w.log.connectionsClosed], [1, 1, 1])
  w.cb().onClosed()
  w.cb().onOutputText('x')
  assert.equal(w.actions.length, before)
})

test('one failing release does not leave the microphone on', async () => {
  const w = setup({ createPlayer: () => ({ enqueue: () => {}, stop: () => {}, close: () => { throw new Error('boom') } }) })
  w.controller.start([])
  await tick()
  w.controller.end()
  assert.equal(w.log.micStopped, 1)
  assert.equal(w.log.connectionsClosed, 1)
})

test('mute and unmute do nothing before the connection is ready', async () => {
  let open!: (c: LiveConnection) => void
  const w = setup({ connect: () => new Promise<LiveConnection>((resolve) => { open = resolve }) })
  w.controller.start([])
  await tick()
  w.controller.mute()
  assert.equal(w.status(), 'connecting')
  open({ sendAudio: () => {}, sendAudioEnd: () => {}, close: () => {} })
  await tick()
  assert.equal(w.status(), 'listening')
})

test('error descriptions are safe and specific', () => {
  assert.equal(describeVoiceError(Object.assign(new Error('x'), { name: 'NotFoundError' })).kind, 'no-microphone')
  assert.equal(describeVoiceError(Object.assign(new Error('x'), { name: 'NotReadableError' })).kind, 'microphone')
  assert.equal(describeVoiceError(new ApiError('network', 'x')).kind, 'token')
  const unknown = describeVoiceError(new Error('wss://host/?access_token=SECRET'))
  assert.equal(unknown.kind, 'connection')
  assert.ok(!unknown.message.includes('SECRET'))
  assert.equal(checkVoiceSupport({ isSecureContext: true, hasGetUserMedia: true, hasAudioWorklet: true, hasWebSocket: true }), null)
  assert.equal(checkVoiceSupport({ isSecureContext: true, hasGetUserMedia: false, hasAudioWorklet: true, hasWebSocket: true })?.kind, 'unsupported')
})

test('resources are released as method calls, so implementations that use `this` still close', async () => {
  let closedWithThis = 0
  const player = {
    open: true,
    enqueue: () => {},
    stop() { this.open = false },
    close() { this.stop(); closedWithThis += 1 },
  }
  const w = setup({ createPlayer: () => player })
  w.controller.start([])
  await tick()
  w.controller.end()
  assert.equal(closedWithThis, 1)
  assert.equal(player.open, false)
})
