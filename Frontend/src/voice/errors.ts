import { ApiError } from '../api/apiError.ts'
import type { VoiceError } from './state.ts'

/** What the browser offers. Passed in so the check can be tested without a browser. */
export type VoiceEnvironment = {
  isSecureContext: boolean
  hasGetUserMedia: boolean
  hasAudioWorklet: boolean
  hasWebSocket: boolean
}

/** Returns why voice cannot run here, or `null` when it can. Nothing is requested from the user at this point. */
export function checkVoiceSupport(env: VoiceEnvironment): VoiceError | null {
  // getUserMedia only exists in secure contexts: https:// or localhost. A phone opening
  // http://<LAN address>:5173 is NOT one, so the microphone is unavailable there.
  if (!env.isSecureContext) {
    return {
      kind: 'insecure-context',
      message: 'Voice needs a secure connection (HTTPS or localhost). Open the app from localhost or over HTTPS to use the microphone.',
    }
  }
  if (!env.hasGetUserMedia || !env.hasAudioWorklet || !env.hasWebSocket) {
    return { kind: 'unsupported', message: 'This browser does not support live voice. Try a current version of Chrome, Edge, Firefox or Safari.' }
  }
  return null
}

const MIC_DENIED = 'Microphone access was blocked. Allow the microphone for this site in your browser settings, then start voice again.'

/** User-facing description of anything that can go wrong while setting up or running a voice session. */
export function describeVoiceError(error: unknown): VoiceError {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'http':
        return { kind: 'token', message: error.message, retryAfterSeconds: error.retryAfterSeconds }
      case 'api-not-configured':
        return { kind: 'token', message: 'The voice service is not configured. Set VITE_API_BASE_URL and restart the app.' }
      case 'network':
        return { kind: 'token', message: 'Could not reach the voice service. Check that the backend is running, then try again.' }
      case 'timeout':
        return { kind: 'token', message: 'The voice service took too long to respond. Please try again.' }
      case 'invalid-response':
        return { kind: 'token', message: 'The voice service sent an unexpected response. Please try again.' }
    }
  }
  const name = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PermissionDeniedError':
      return { kind: 'permission-denied', message: MIC_DENIED }
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return { kind: 'no-microphone', message: 'No microphone was found. Connect one and try again.' }
    case 'NotReadableError':
    case 'AbortError':
    case 'TrackStartError':
      return { kind: 'microphone', message: 'The microphone could not be used. Another app may be using it.' }
  }
  return { kind: 'connection', message: 'The voice connection failed. Please try again.' }
}

export const SESSION_ENDED_MESSAGE: VoiceError = {
  kind: 'connection',
  message: 'The voice session ended. Your completed messages are kept. Start voice again to continue.',
}

export const SESSION_LIMIT_MESSAGE: VoiceError = {
  kind: 'session-limit',
  message: 'The voice session reached its time limit. Your completed messages are kept. Start voice again to continue.',
}
