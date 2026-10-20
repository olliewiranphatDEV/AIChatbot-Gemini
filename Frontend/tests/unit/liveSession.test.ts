import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pcm16ToBase64 } from '../../src/voice/audio.ts'
import { createVoiceController } from '../../src/voice/controller.ts'
import type { AudioPlayer, LiveCallbacks, LiveConnection, MicCapture, VoiceDeps } from '../../src/voice/controller.ts'
import { describeVoice, initialVoiceState, voiceReducer } from '../../src/voice/state.ts'
import type { VoiceAction, VoiceError } from '../../src/voice/state.ts'

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const error: VoiceError = { kind: 'connection', message: 'x' }
const run = (actions: VoiceAction[]) => actions.reduce(voiceReducer, initialVoiceState)

function world(overrides: Partial<VoiceDeps> = {}) {
  const actions: VoiceAction[] = []
  let callbacks!: LiveCallbacks
  let now = 1_000_000
  let onPlaying: (playing: boolean) => void = () => {}
  const deps: VoiceDeps = {
    checkSupport: () => null,
    startCapture: async () => ({ setMuted: () => {}, stop: () => {} }) as MicCapture,
    createPlayer: (playing) => {
      onPlaying = playing
      return { enqueue: () => {}, stop: () => {}, close: () => {} } as AudioPlayer
    },
    requestToken: async () => ({ token: 't', model: 'm' }),
    connect: async (params) => {
      callbacks = params.callbacks
      return { sendAudio: () => {}, sendAudioEnd: () => {}, close: () => {} } as LiveConnection
    },
    now: () => now,
    ...overrides,
  }
  const controller = createVoiceController(deps, { dispatch: (a) => actions.push(a), transcript: () => {} })
  const state = () => actions.reduce(voiceReducer, initialVoiceState)
  return { controller, actions, state, cb: () => callbacks, playing: (p: boolean) => onPlaying(p), advance: (ms: number) => { now += ms } }
}
const started = async (overrides: Partial<VoiceDeps> = {}) => {
  const w = world(overrides)
  w.controller.start([])
  await sleep(0)
  return w
}

// ---- state machine ----------------------------------------------------------------------
test('thinking starts after the user spoke, ends when the AI starts answering, and never overlaps speaking', () => {
  const active = run([{ type: 'start' }, { type: 'connected' }])
  const thinking = voiceReducer(active, { type: 'thinking' })
  assert.equal(thinking.thinking, true)
  const speaking = voiceReducer(thinking, { type: 'ai-speaking' })
  assert.deepEqual([speaking.speaking, speaking.thinking], [true, false])
  assert.equal(voiceReducer(speaking, { type: 'thinking' }), speaking, 'cannot think while speaking')
  assert.equal(voiceReducer(thinking, { type: 'not-thinking' }).thinking, false)
  assert.equal(voiceReducer(initialVoiceState, { type: 'thinking' }), initialVoiceState, 'only inside a session')
  assert.equal(describeVoice(thinking), 'listening')
})

test('connection and end times are recorded for the timer and survive into ended / error', () => {
  const active = run([{ type: 'start' }, { type: 'connected', at: 1000 }])
  assert.equal(active.connectedAt, 1000)
  const ended = voiceReducer(active, { type: 'end', at: 6000 })
  assert.deepEqual([ended.connectedAt, ended.endedAt], [1000, 6000])
  const failed = voiceReducer(active, { type: 'fail', error, at: 7000 })
  assert.deepEqual([failed.connectedAt, failed.endedAt], [1000, 7000])
  assert.equal(voiceReducer(failed, { type: 'start' }).connectedAt, undefined, 'a new session starts a new clock')
})

// ---- controller ---------------------------------------------------------------------------
test('thinking: when the user stops talking and no answer starts, the status becomes thinking; the answer ends it', async () => {
  const w = await started({ thinkingDelayMs: 15 })
  w.cb().onInputText('What is the moon')
  assert.ok(!w.actions.some((a) => a.type === 'thinking'), 'not immediately')
  await sleep(40)
  assert.ok(w.actions.some((a) => a.type === 'thinking'))
  w.cb().onAudio(pcm16ToBase64(Int16Array.from([1, 2, 3])))
  w.playing(true)
  assert.equal(w.state().speaking, true)
  assert.equal(w.state().thinking, false)
})

test('thinking is postponed while the user keeps talking and cancelled when the AI answers first', async () => {
  const w = await started({ thinkingDelayMs: 30 })
  w.cb().onInputText('a')
  await sleep(20)
  w.cb().onInputText(' b') // still talking: the countdown restarts
  await sleep(20)
  assert.ok(!w.actions.some((a) => a.type === 'thinking'))
  w.cb().onOutputText('answer') // the AI answered before the delay passed
  await sleep(50)
  assert.ok(!w.actions.some((a) => a.type === 'thinking'))
})

test('a pending thinking timer never fires after the session ended', async () => {
  const w = await started({ thinkingDelayMs: 20 })
  w.cb().onInputText('hello')
  w.controller.end()
  await sleep(50)
  assert.ok(!w.actions.some((a) => a.type === 'thinking'))
})

test('an interruption clears thinking', async () => {
  const w = await started({ thinkingDelayMs: 10 })
  w.cb().onInputText('hello')
  await sleep(30)
  assert.equal(w.state().thinking, true)
  w.cb().onInterrupted()
  assert.equal(w.state().thinking, false)
})

test('connection and end times come from the injected clock', async () => {
  const w = await started()
  const connected = w.actions.find((a) => a.type === 'connected')
  assert.equal(connected?.type === 'connected' && connected.at, 1_000_000)
  w.advance(5000)
  w.controller.end()
  const ended = w.actions.find((a) => a.type === 'end')
  assert.equal(ended?.type === 'end' && ended.at, 1_005_000)
})

test('levels come from the live microphone and player, and are zero without a session', async () => {
  let micLevel = 0.25
  const aiLevel = 0.5
  const w = world({
    startCapture: async () => ({ setMuted: () => {}, stop: () => {}, getLevel: () => micLevel }) as MicCapture,
    createPlayer: () => ({ enqueue: () => {}, stop: () => {}, close: () => {}, getLevel: () => aiLevel }) as AudioPlayer,
  })
  assert.deepEqual(w.controller.levels(), { mic: 0, ai: 0 })
  w.controller.start([])
  await sleep(0)
  assert.deepEqual(w.controller.levels(), { mic: 0.25, ai: 0.5 })
  micLevel = 0.75
  assert.equal(w.controller.levels().mic, 0.75)
  w.controller.end()
  assert.deepEqual(w.controller.levels(), { mic: 0, ai: 0 })
})
