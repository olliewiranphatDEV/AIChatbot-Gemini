import type { ChatApiMessage, ChatReplyResponse, HealthResponse, LiveTokenResponse, TranscribeResponse } from '../types/api.ts'
import { ApiError } from './apiError.ts'

export { ApiError }
export type { ApiErrorCode } from './apiError.ts'

// Backend base URL without a trailing slash, e.g. http://localhost:3001.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() ?? '').replace(/\/+$/, '')

export const isApiConfigured = apiBaseUrl.length > 0

/** How long to wait for the backend. It gives Gemini 45 seconds, so wait a little longer. */
const REQUEST_TIMEOUT_MS = 60_000

/** The backend's error body: `{"error":{"code":"...","message":"..."}}`. Its messages are written to be shown to users. */
async function readHttpError(response: Response): Promise<ApiError> {
  let serverCode: string | undefined
  let serverMessage: string | undefined
  let retryAfterSeconds: number | undefined
  try {
    const data: unknown = await response.json()
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const { error } = data
      if (typeof error === 'object' && error !== null) {
        if ('code' in error && typeof error.code === 'string') serverCode = error.code
        if ('message' in error && typeof error.message === 'string') serverMessage = error.message
        if ('retryAfterSeconds' in error && typeof error.retryAfterSeconds === 'number') retryAfterSeconds = error.retryAfterSeconds
      }
    }
  } catch {
    // Not a JSON error body; fall back to the generic message below.
  }
  return new ApiError('http', serverMessage ?? `The backend responded with status ${response.status}.`, {
    status: response.status,
    serverCode,
    retryAfterSeconds,
  })
}

/** `body` is sent as JSON; `raw` is sent as it is (a recording). */
type RequestOptions = {
  method: 'GET' | 'POST'
  body?: unknown
  raw?: { data: Uint8Array<ArrayBuffer>; contentType: string }
  signal?: AbortSignal
}

async function apiRequest<T>(path: `/${string}`, options: RequestOptions, parse: (data: unknown) => T): Promise<T> {
  if (!isApiConfigured) throw new ApiError('api-not-configured', 'VITE_API_BASE_URL is not set.')

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  const hasBody = options.body !== undefined
  const contentType = options.raw?.contentType ?? (hasBody ? 'application/json' : undefined)

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method,
      headers: { Accept: 'application/json', ...(contentType ? { 'Content-Type': contentType } : {}) },
      body: options.raw ? options.raw.data : hasBody ? JSON.stringify(options.body) : undefined,
      signal,
    })
  } catch (cause) {
    // Let callers recognise their own cancellation instead of reporting a failure.
    if (options.signal?.aborted) throw cause
    if (timeout.aborted) throw new ApiError('timeout', 'The backend took too long to respond.', { cause })
    throw new ApiError('network', 'Could not reach the backend.', { cause })
  }

  if (!response.ok) throw await readHttpError(response)

  let data: unknown
  try {
    data = await response.json()
  } catch (cause) {
    throw new ApiError('invalid-response', 'The backend response was not valid JSON.', { cause })
  }
  return parse(data)
}

function parseHealth(data: unknown): HealthResponse {
  if (
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    data.status === 'ok' &&
    'service' in data &&
    typeof data.service === 'string'
  ) {
    return { status: 'ok', service: data.service }
  }
  throw new ApiError('invalid-response', 'The backend health response had an unexpected shape.')
}

function parseChatReply(data: unknown): ChatReplyResponse {
  if (typeof data === 'object' && data !== null && 'reply' in data && typeof data.reply === 'string' && data.reply.trim() !== '') {
    return { reply: data.reply }
  }
  throw new ApiError('invalid-response', 'The backend chat response had an unexpected shape.')
}

function parseLiveToken(data: unknown): LiveTokenResponse {
  if (typeof data === 'object' && data !== null) {
    const { token, model, expiresAt, newSessionExpiresAt } = data as Record<string, unknown>
    if (typeof token === 'string' && token && typeof model === 'string' && model && typeof expiresAt === 'string' && typeof newSessionExpiresAt === 'string') {
      return { token, model, expiresAt, newSessionExpiresAt }
    }
  }
  throw new ApiError('invalid-response', 'The backend voice token response had an unexpected shape.')
}

/** Ask the backend whether it is up. Not called by the app itself; used for connectivity checks. */
export function fetchBackendHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest('/api/health', { method: 'GET', signal }, parseHealth)
}

/**
 * Send a conversation to Gemini through the backend. `messages` is the earlier
 * successful exchange plus the new user message, which must be last.
 */
export function sendChatMessages(messages: readonly ChatApiMessage[], signal?: AbortSignal): Promise<ChatReplyResponse> {
  return apiRequest('/api/chat', { method: 'POST', body: { messages }, signal }, parseChatReply)
}

/**
 * Ask the backend for a short-lived, single-use token for one Gemini Live (voice)
 * session. The permanent API key never leaves the backend. The response must not
 * be stored, so it is only ever held in memory.
 */
export function requestLiveToken(signal?: AbortSignal): Promise<LiveTokenResponse> {
  return apiRequest('/api/live-token', { method: 'POST', signal }, parseLiveToken)
}

function parseTranscript(data: unknown): TranscribeResponse {
  if (typeof data === 'object' && data !== null && 'text' in data && typeof data.text === 'string' && data.text.trim() !== '') {
    return { text: data.text }
  }
  throw new ApiError('invalid-response', 'The backend transcription response had an unexpected shape.')
}

/**
 * Turn a recording (WAV, see voice/wav.ts) into text. The text is only shown to the user
 * to review; nothing is sent to the AI chat from here.
 */
export function transcribeRecording(wav: Uint8Array<ArrayBuffer>, signal?: AbortSignal): Promise<string> {
  return apiRequest('/api/transcribe', { method: 'POST', raw: { data: wav, contentType: 'audio/wav' }, signal }, parseTranscript).then(
    (response) => response.text,
  )
}
