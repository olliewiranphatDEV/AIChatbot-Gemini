import assert from 'node:assert/strict'
import { test } from 'node:test'
import { badgeText, deriveLiveStatus, formatElapsed, microphoneText } from '../../src/voice/liveStatus.ts'
import { initialVoiceState, voiceReducer } from '../../src/voice/state.ts'
import type { VoiceAction, VoiceError, VoiceState } from '../../src/voice/state.ts'

const run = (actions: VoiceAction[]): VoiceState => actions.reduce(voiceReducer, initialVoiceState)
const active = [{ type: 'start' }, { type: 'connected', at: 0 }] as VoiceAction[]
const label = (state: VoiceState) => deriveLiveStatus(state).label

test('each real state has its own status line', () => {
  assert.equal(label(initialVoiceState), 'Ready to start')
  assert.equal(label(run([{ type: 'start' }])), 'Connecting…')
  assert.equal(label(run(active)), 'Listening…')
  assert.equal(label(run([...active, { type: 'thinking' }])), 'Thinking…')
  assert.equal(label(run([...active, { type: 'ai-speaking' }])), 'AI is speaking')
  assert.equal(label(run([...active, { type: 'mute' }])), 'Microphone muted')
  assert.equal(label(run([...active, { type: 'end' }])), 'Session ended')
})

test('while the AI speaks the line says so even if the microphone is muted; the footer shows the mute', () => {
  const state = run([...active, { type: 'ai-speaking' }, { type: 'mute' }])
  assert.equal(label(state), 'AI is speaking')
  assert.match(microphoneText(state), /Microphone muted/)
  assert.match(microphoneText(run(active)), /Microphone on/)
})

test('failures are named by their cause', () => {
  const failWith = (kind: VoiceError['kind']) => label(run([{ type: 'start' }, { type: 'fail', error: { kind, message: 'x' } }]))
  assert.equal(failWith('permission-denied'), 'Permission denied')
  assert.equal(failWith('connection'), 'Connection lost')
  assert.equal(failWith('no-microphone'), 'No microphone found')
  assert.equal(failWith('insecure-context'), 'Secure connection needed')
})

test('the LIVE badge only says LIVE while a connection exists', () => {
  assert.deepEqual(badgeText(initialVoiceState), { label: 'READY', live: false })
  assert.deepEqual(badgeText(run([{ type: 'start' }])), { label: 'CONNECTING', live: false })
  assert.deepEqual(badgeText(run(active)), { label: 'LIVE', live: true })
  assert.equal(badgeText(run([...active, { type: 'fail', error: { kind: 'connection', message: 'x' } }])).live, false)
  assert.equal(badgeText(run([...active, { type: 'end' }])).label, 'ENDED')
})

test('elapsed time formats as mm:ss and h:mm:ss, never negative', () => {
  assert.equal(formatElapsed(0), '00:00')
  assert.equal(formatElapsed(272.9), '04:32')
  assert.equal(formatElapsed(3723), '1:02:03')
  assert.equal(formatElapsed(-5), '00:00')
})
