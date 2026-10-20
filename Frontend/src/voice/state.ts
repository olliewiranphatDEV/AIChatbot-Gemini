// Voice session state machine. Pure, so every transition is unit-tested.
//
//   idle --start--> connecting --connected--> active (listening | speaking, optionally muted)
//   active --end--> ended        any --fail--> error        ended/error --start--> connecting
//
// The phase says whether a session exists; `muted` and `speaking` are independent flags
// inside the active phase. `describeVoice` folds them into the single status the UI shows.

export type VoiceErrorKind =
  | 'unsupported'
  | 'insecure-context'
  | 'permission-denied'
  | 'no-microphone'
  | 'microphone'
  | 'token'
  | 'connection'
  | 'session-limit'

export type VoiceError = {
  kind: VoiceErrorKind
  /** Safe to show to the user. */
  message: string
  /** When the failure was a rate limit: how long to wait before trying again. */
  retryAfterSeconds?: number
}

export type VoiceState = {
  phase: 'idle' | 'connecting' | 'active' | 'ended' | 'error'
  muted: boolean
  speaking: boolean
  /** The user has finished speaking and the AI has not started answering yet. */
  thinking: boolean
  /** Clock times (ms) of the connection and of the end of the session; they drive the elapsed-time display. */
  connectedAt?: number
  endedAt?: number
  error?: VoiceError
}

export type VoiceAction =
  | { type: 'start' }
  | { type: 'connected'; at?: number }
  | { type: 'ai-speaking' }
  | { type: 'ai-silent' }
  | { type: 'thinking' }
  | { type: 'not-thinking' }
  | { type: 'mute' }
  | { type: 'unmute' }
  | { type: 'end'; at?: number }
  | { type: 'fail'; error: VoiceError; at?: number }
  /** Dismiss the ended/error notice. */
  | { type: 'reset' }

export const initialVoiceState: VoiceState = { phase: 'idle', muted: false, speaking: false, thinking: false }

export function voiceReducer(state: VoiceState, action: VoiceAction): VoiceState {
  switch (action.type) {
    case 'start':
      // A second session cannot start while one exists.
      if (state.phase === 'connecting' || state.phase === 'active') return state
      return { phase: 'connecting', muted: false, speaking: false, thinking: false }
    case 'connected':
      return state.phase === 'connecting' ? { ...state, phase: 'active', connectedAt: action.at } : state
    case 'ai-speaking':
      // The AI answering ends "thinking".
      return state.phase === 'active' && (!state.speaking || state.thinking) ? { ...state, speaking: true, thinking: false } : state
    case 'ai-silent':
      return state.phase === 'active' && state.speaking ? { ...state, speaking: false } : state
    case 'thinking':
      return state.phase === 'active' && !state.speaking && !state.thinking ? { ...state, thinking: true } : state
    case 'not-thinking':
      return state.phase === 'active' && state.thinking ? { ...state, thinking: false } : state
    case 'mute':
      return state.phase === 'active' && !state.muted ? { ...state, muted: true } : state
    case 'unmute':
      return state.phase === 'active' && state.muted ? { ...state, muted: false } : state
    case 'end':
      return state.phase === 'connecting' || state.phase === 'active'
        ? { phase: 'ended', muted: false, speaking: false, thinking: false, connectedAt: state.connectedAt, endedAt: action.at }
        : state
    case 'fail':
      return { phase: 'error', muted: false, speaking: false, thinking: false, connectedAt: state.connectedAt, endedAt: action.at, error: action.error }
    case 'reset':
      return state.phase === 'ended' || state.phase === 'error' ? initialVoiceState : state
  }
}

/** True while a session exists (or is being set up), i.e. while the microphone may be in use. */
export function isVoiceBusy(state: VoiceState): boolean {
  return state.phase === 'connecting' || state.phase === 'active'
}

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'muted' | 'ended' | 'error'

export function describeVoice(state: VoiceState): VoiceStatus {
  switch (state.phase) {
    case 'idle':
      return 'idle'
    case 'connecting':
      return 'connecting'
    case 'ended':
      return 'ended'
    case 'error':
      return 'error'
    case 'active':
      if (state.muted) return 'muted'
      return state.speaking ? 'speaking' : 'listening'
  }
}

export const VOICE_STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: 'Voice off',
  connecting: 'Connecting...',
  listening: 'Listening',
  speaking: 'AI speaking',
  muted: 'Muted',
  ended: 'Voice ended',
  error: 'Voice error',
}
