import { FinishReason, GoogleGenAI, ThinkingLevel } from '@google/genai'
import type { Content, GenerateContentResponse } from '@google/genai'
import type { GeminiSettings } from './config.js'
import { HttpError } from './errors.js'
import { logUpstreamFailure, toChatError } from './upstream.js'

export { toChatError }

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

export type ReplyGenerator = {
  /**
   * Answer the last message of `messages`, using the earlier ones as context.
   * Stateless: nothing is remembered between calls.
   */
  generateReply(messages: readonly ChatTurn[], options?: { signal?: AbortSignal }): Promise<string>
}

/** The only part of the SDK client this module uses; lets tests inject a fake. */
export type GeminiClient = { models: Pick<GoogleGenAI['models'], 'generateContent'> }

/** Give up on a single Gemini call after this long (the frontend waits a little longer). */
export const GEMINI_TIMEOUT_MS = 45_000
/** Upper bound for one reply. Gemini counts its internal "thinking" tokens in this limit too. */
export const MAX_OUTPUT_TOKENS = 4096

// The chat UI renders plain paragraphs and numbered lists, not Markdown.
const SYSTEM_INSTRUCTION = [
  'You are AI Chat, a helpful general-purpose assistant.',
  'Reply in the language the user writes in.',
  'Write plain text without Markdown: no asterisks, backticks, tables, or headings.',
  'Use short paragraphs, and write lists as numbered lines such as "1. ...".',
].join(' ')

/** Application roles use "assistant"; the Gemini API calls that role "model". */
export function toContents(messages: readonly ChatTurn[]): Content[] {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }))
}

const BLOCKED_FINISH_REASONS = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
])

const blockedError = () =>
  new HttpError(422, 'ai_response_blocked', 'The AI could not answer this message. Try rephrasing it.')

/** Pull the reply text out of a response, or throw a safe error for blocked/empty results. */
export function extractReply(response: GenerateContentResponse): string {
  if (response.promptFeedback?.blockReason) throw blockedError()

  const text = response.text?.trim()
  if (text) return text

  const finishReason = response.candidates?.[0]?.finishReason
  if (finishReason && BLOCKED_FINISH_REASONS.has(finishReason)) throw blockedError()
  throw new HttpError(502, 'ai_empty_response', 'The AI returned an empty response. Please try again.')
}

export function createGeminiService(
  settings: GeminiSettings,
  deps: { client?: GeminiClient; timeoutMs?: number } = {},
): ReplyGenerator {
  let client = deps.client
  const timeoutMs = deps.timeoutMs ?? GEMINI_TIMEOUT_MS

  return {
    async generateReply(messages, options = {}) {
      if (!settings.apiKey) {
        throw new HttpError(503, 'ai_not_configured', 'The AI service is not configured on the server.')
      }
      // Created on first use, so starting the server and /api/health never touch Gemini.
      client ??= new GoogleGenAI({ apiKey: settings.apiKey })

      const controller = new AbortController()
      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, timeoutMs)
      const onCallerAbort = () => controller.abort()
      if (options.signal?.aborted) controller.abort()
      else options.signal?.addEventListener('abort', onCallerAbort)

      try {
        const response = await client.models.generateContent({
          model: settings.model,
          contents: toContents(messages),
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            // Thinking is on by default; the lowest documented level keeps replies fast.
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            abortSignal: controller.signal,
            // The SDK retries 408/429/5xx up to 5 times by default. One attempt only:
            // retrying a quota error wastes free-tier requests.
            httpOptions: { retryOptions: { attempts: 1 } },
          },
        })
        return extractReply(response)
      } catch (error) {
        // The caller left; there is nobody to report to.
        if (options.signal?.aborted) throw error
        const chatError = toChatError(error, timedOut)
        logUpstreamFailure('chat request', settings.model, error, chatError)
        throw chatError
      } finally {
        clearTimeout(timer)
        options.signal?.removeEventListener('abort', onCallerAbort)
      }
    },
  }
}
