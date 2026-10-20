// What the Live screen says, derived from the real session state. Pure, so it is unit-tested.

import type { VoiceError, VoiceErrorKind, VoiceState } from './state.ts'

export type LiveStatusKey = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'muted' | 'ended' | 'error'

export type LiveStatus = {
  key: LiveStatusKey
  /** The main status line under the orb. */
  label: string
}

const ERROR_LABEL: Record<VoiceErrorKind, string> = {
  'permission-denied': 'Permission denied',
  'no-microphone': 'No microphone found',
  microphone: 'Microphone unavailable',
  'insecure-context': 'Secure connection needed',
  unsupported: 'Not supported here',
  'session-limit': 'Session time limit reached',
  connection: 'Connection lost',
  token: 'Could not connect',
}

export const errorLabel = (error: VoiceError | undefined) => (error ? ERROR_LABEL[error.kind] : 'Connection lost')

/**
 * One status for the screen. The AI's own activity wins over the microphone's: while the
 * AI speaks the line says so even if the microphone is muted (the footer shows the mute).
 */
export function deriveLiveStatus(state: VoiceState): LiveStatus {
  switch (state.phase) {
    case 'idle':
      return { key: 'idle', label: 'Ready to start' }
    case 'connecting':
      return { key: 'connecting', label: 'Connecting…' }
    case 'ended':
      return { key: 'ended', label: 'Session ended' }
    case 'error':
      return { key: 'error', label: errorLabel(state.error) }
    case 'active':
      if (state.speaking) return { key: 'speaking', label: 'AI is speaking' }
      if (state.thinking) return { key: 'thinking', label: 'Thinking…' }
      if (state.muted) return { key: 'muted', label: 'Microphone muted' }
      return { key: 'listening', label: 'Listening…' }
  }
}

/** The microphone line in the footer. Independent of what the AI is doing. */
export function microphoneText(state: VoiceState): string {
  switch (state.phase) {
    case 'connecting':
      return 'Getting the microphone ready…'
    case 'active':
      return state.muted ? 'Microphone muted · The AI cannot hear you' : 'Microphone on · Listening while you speak'
    default:
      return 'Microphone off'
  }
}

/** The LIVE badge only says LIVE while a connection really exists. */
export function badgeText(state: VoiceState): { label: string; live: boolean } {
  switch (state.phase) {
    case 'active':
      return { label: 'LIVE', live: true }
    case 'connecting':
      return { label: 'CONNECTING', live: false }
    case 'error':
      return { label: 'OFFLINE', live: false }
    case 'ended':
      return { label: 'ENDED', live: false }
    default:
      return { label: 'READY', live: false }
  }
}

/** 75 -> "01:15"; an hour or more -> "1:02:03". */
export function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`
}
