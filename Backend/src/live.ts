import { GoogleGenAI, Modality } from '@google/genai'
import type { CreateAuthTokenParameters } from '@google/genai'
import type { GeminiSettings } from './config.js'
import { HttpError } from './errors.js'
import { logUpstreamFailure, toChatError } from './upstream.js'

/** What the browser needs to open one Gemini Live session. */
export type LiveTokenResult = {
  /** Short-lived, single-use credential. Not the API key. */
  token: string
  model: string
  /** After this time Gemini rejects messages on sessions that use the token. */
  expiresAt: string
  /** The token can only start a new session until this time. */
  newSessionExpiresAt: string
}

export type LiveTokenIssuer = {
  createToken(): Promise<LiveTokenResult>
}

/** The only part of the SDK client this module uses; lets tests inject a fake. */
export type AuthTokensClient = { authTokens: Pick<GoogleGenAI['authTokens'], 'create'> }

/** A voice session lasts at most 15 minutes (audio only), so the token is not needed beyond this. */
export const LIVE_TOKEN_TTL_MS = 20 * 60_000
/** The token must be used to start its session within this window. */
export const LIVE_TOKEN_START_WINDOW_MS = 60_000

// Kept on the server on purpose: it is locked into the token, so the browser cannot change it.
export const VOICE_SYSTEM_INSTRUCTION = [
  'You are AI Chat, a helpful assistant in a live voice conversation.',
  'Reply in the language the user speaks; if they speak Thai, answer in Thai.',
  'Keep answers short and natural for speech: usually one to three sentences.',
  'Do not use Markdown, lists, or symbols that are awkward to read aloud.',
  'If the audio is unclear, politely ask the user to repeat it.',
].join(' ')

/**
 * Session settings locked into the token. Whatever the browser sends for these
 * fields is ignored by Gemini, so a leaked token can only start an audio session
 * on this one model with these instructions. Earlier conversation
 * turns are not part of the token: the browser sends them as text after the session opens.
 */
export function buildLiveConstraints(model: string): NonNullable<CreateAuthTokenParameters['config']>['liveConnectConstraints'] {
  return {
    model,
    config: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: VOICE_SYSTEM_INSTRUCTION,
      // Lets long conversations continue by dropping the oldest context (see the Live session guide).
      contextWindowCompression: { slidingWindow: {} },
    },
  }
}

export function createLiveTokenService(
  settings: GeminiSettings,
  deps: { client?: AuthTokensClient; now?: () => number } = {},
): LiveTokenIssuer {
  let client = deps.client
  const now = deps.now ?? Date.now

  return {
    async createToken() {
      if (!settings.apiKey) {
        throw new HttpError(503, 'ai_not_configured', 'The AI service is not configured on the server.')
      }
      client ??= new GoogleGenAI({ apiKey: settings.apiKey })

      const expiresAt = new Date(now() + LIVE_TOKEN_TTL_MS).toISOString()
      const newSessionExpiresAt = new Date(now() + LIVE_TOKEN_START_WINDOW_MS).toISOString()
      try {
        const created = await client.authTokens.create({
          config: {
            uses: 1,
            expireTime: expiresAt,
            newSessionExpireTime: newSessionExpiresAt,
            liveConnectConstraints: buildLiveConstraints(settings.liveModel),
            httpOptions: { retryOptions: { attempts: 1 } },
          },
        })
        if (!created.name) throw new Error('empty token')
        return { token: created.name, model: settings.liveModel, expiresAt, newSessionExpiresAt }
      } catch (error) {
        const mapped = toChatError(error)
        logUpstreamFailure('live token', settings.liveModel, error, mapped)
        throw mapped
      }
    },
  }
}
