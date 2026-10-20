import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeVoice, initialVoiceState, isVoiceBusy, voiceReducer } from '../../src/voice/state.ts'
import type { VoiceAction, VoiceError, VoiceState } from '../../src/voice/state.ts'

const run = (actions: VoiceAction[], from: VoiceState = initialVoiceState) => actions.reduce(voiceReducer, from)
const error: VoiceError = { kind: 'connection', message: 'x' }

test('happy path: idle -> connecting -> listening -> AI speaking -> listening -> ended', () => {
  let state = initialVoiceState
  const seen: string[] = [describeVoice(state)]
  const actions: VoiceAction[] = [{ type: 'start' }, { type: 'connected' }, { type: 'ai-speaking' }, { type: 'ai-silent' }, { type: 'end' }]
  for (const action of actions) {
    state = voiceReducer(state, action)
    seen.push(describeVoice(state))
  }
  assert.deepEqual(seen, ['idle', 'connecting', 'listening', 'speaking', 'listening', 'ended'])
})

test('muted wins over speaking in the status, and unmuting returns to the real activity', () => {
  const speaking = run([{ type: 'start' }, { type: 'connected' }, { type: 'ai-speaking' }])
  const muted = voiceReducer(speaking, { type: 'mute' })
  assert.equal(describeVoice(muted), 'muted')
  assert.equal(describeVoice(voiceReducer(muted, { type: 'unmute' })), 'speaking')
})

test('mute, speaking and connected only apply at the right phase', () => {
  for (const action of [{ type: 'mute' }, { type: 'ai-speaking' }, { type: 'connected' }] as VoiceAction[]) {
    assert.deepEqual(voiceReducer(initialVoiceState, action), initialVoiceState)
  }
  const connecting = run([{ type: 'start' }])
  assert.equal(voiceReducer(connecting, { type: 'mute' }), connecting)
})

test('a second start while connecting or active is ignored (no duplicate session)', () => {
  const connecting = run([{ type: 'start' }])
  assert.equal(voiceReducer(connecting, { type: 'start' }), connecting)
  const active = run([{ type: 'start' }, { type: 'connected' }, { type: 'mute' }])
  assert.equal(voiceReducer(active, { type: 'start' }), active)
  assert.ok(isVoiceBusy(connecting) && isVoiceBusy(active))
})

test('failure reports the error and clears mute/speaking; start then begins a clean session', () => {
  const failed = run([{ type: 'start' }, { type: 'connected' }, { type: 'mute' }, { type: 'fail', error }])
  assert.equal(describeVoice(failed), 'error')
  assert.deepEqual(failed.error, error)
  assert.equal(failed.muted, false)
  assert.ok(!isVoiceBusy(failed))
  const restarted = voiceReducer(failed, { type: 'start' })
  assert.deepEqual([restarted.phase, restarted.muted, restarted.speaking, restarted.thinking], ['connecting', false, false, false])
})

test('ending resets mute; end does nothing without a session; reset only dismisses ended/error', () => {
  const ended = run([{ type: 'start' }, { type: 'connected' }, { type: 'mute' }, { type: 'end' }])
  assert.deepEqual([ended.phase, ended.muted, ended.speaking, ended.thinking], ['ended', false, false, false])
  assert.equal(voiceReducer(initialVoiceState, { type: 'end' }), initialVoiceState)
  assert.deepEqual(voiceReducer(ended, { type: 'reset' }), initialVoiceState)
  const active = run([{ type: 'start' }, { type: 'connected' }])
  assert.equal(voiceReducer(active, { type: 'reset' }), active)
})
