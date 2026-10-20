import { Router } from 'express'
import { HttpError } from '../errors.js'
import type { ChatTurn, ReplyGenerator } from '../gemini.js'

/**
 * Input limits. They sit inside the 100 kb JSON body limit even for Thai text
 * (3 bytes per character in UTF-8): 30,000 characters is at most about 90 kb.
 * A single message may be long enough to hold a full-length Gemini reply, which
 * the frontend sends back as history. Keep Frontend/src/api/chatMessages.ts in sync.
 */
export const CHAT_LIMITS = {
  maxMessages: 50,
  maxMessageChars: 12_000,
  maxTotalChars: 30_000,
} as const

const invalid = (message: string) => new HttpError(400, 'invalid_request', message)

/** Validate a `POST /api/chat` body and return the conversation to send to Gemini. */
export function parseChatRequest(body: unknown): ChatTurn[] {
  const messages = (body as { messages?: unknown } | null | undefined)?.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    throw invalid('"messages" must be a non-empty array.')
  }
  if (messages.length > CHAT_LIMITS.maxMessages) {
    throw invalid(`"messages" can contain at most ${CHAT_LIMITS.maxMessages} items.`)
  }

  let totalChars = 0
  const turns = messages.map((item: unknown, index): ChatTurn => {
    const { role, content } = (item ?? {}) as { role?: unknown; content?: unknown }
    if (role !== 'user' && role !== 'assistant') {
      throw invalid(`messages[${index}].role must be "user" or "assistant".`)
    }
    if (typeof content !== 'string' || content.trim() === '') {
      throw invalid(`messages[${index}].content must be a non-empty string.`)
    }
    if (content.length > CHAT_LIMITS.maxMessageChars) {
      throw invalid(`messages[${index}].content is longer than ${CHAT_LIMITS.maxMessageChars} characters.`)
    }
    totalChars += content.length
    return { role, content }
  })

  if (totalChars > CHAT_LIMITS.maxTotalChars) {
    throw invalid(`The messages together are longer than ${CHAT_LIMITS.maxTotalChars} characters.`)
  }
  if (turns[0].role !== 'user') throw invalid('The first message must be from the user.')
  if (turns[turns.length - 1].role !== 'user') throw invalid('The last message must be from the user.')
  return turns
}

export function createChatRouter(generator: ReplyGenerator) {
  const router = Router()

  router.post('/chat', async (req, res) => {
    const messages = parseChatRequest(req.body)

    // Stop the Gemini call if the browser gives up (for example the Stop button).
    const controller = new AbortController()
    const onClose = () => {
      if (!res.writableFinished) controller.abort()
    }
    res.on('close', onClose)

    try {
      const reply = await generator.generateReply(messages, { signal: controller.signal })
      if (controller.signal.aborted) return
      res.status(200).json({ reply })
    } catch (error) {
      if (controller.signal.aborted) return
      throw error
    } finally {
      res.off('close', onClose)
    }
  })

  return router
}
