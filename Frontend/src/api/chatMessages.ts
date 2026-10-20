import type { ChatApiMessage } from '../types/api.ts'
import type { ChatMessageData, MessageBlock } from '../types/chat.ts'
import { ApiError } from './apiError.ts'

/** Mirrors CHAT_LIMITS in Backend/src/routes/chat.ts. Keep the two in sync. */
const MAX_MESSAGES = 50
const MAX_MESSAGE_CHARS = 12_000
const MAX_TOTAL_CHARS = 30_000

/** The text of a message as the model should see it (lists become numbered lines). */
export function blocksToText(blocks: readonly MessageBlock[]): string {
  return blocks
    .map((block) =>
      block.type === 'paragraph' ? block.text : block.items.map((item, index) => `${index + 1}. ${item}`).join('\n'),
    )
    .join('\n\n')
}

/**
 * The completed exchanges of a conversation: a user message directly followed by an
 * assistant message that finished (`done`). A user message that never got a reply
 * (stopped, failed, pending), and any interrupted or partial voice turn, is left out,
 * so a failed or cut-off turn does not poison later requests.
 */
function completedPairs(history: readonly ChatMessageData[]): [ChatApiMessage, ChatApiMessage][] {
  const pairs: [ChatApiMessage, ChatApiMessage][] = []
  for (let index = 0; index < history.length - 1; index += 1) {
    const message = history[index]
    const reply = history[index + 1]
    const userDone = message.role === 'user' && (message.status === undefined || message.status === 'done')
    const text = userDone ? blocksToText(message.blocks).trim() : ''
    const replyText = reply.role === 'assistant' && reply.status === 'done' ? blocksToText(reply.blocks).trim() : ''
    if (text && replyText) {
      pairs.push([
        { role: 'user', content: text.slice(0, MAX_MESSAGE_CHARS) },
        { role: 'assistant', content: replyText.slice(0, MAX_MESSAGE_CHARS) },
      ])
      index += 1
    }
  }
  return pairs
}

/**
 * Build the `/api/chat` payload: earlier *successful* exchanges (typed or spoken)
 * plus the new user message. Oldest exchanges are dropped when the conversation
 * grows past the backend's input limits.
 */
export function toApiMessages(history: readonly ChatMessageData[], newUserText: string): ChatApiMessage[] {
  const pairs = completedPairs(history)
  const latest: ChatApiMessage = { role: 'user', content: newUserText }
  const size = () => pairs.reduce((sum, [a, b]) => sum + a.content.length + b.content.length, latest.content.length)
  while (pairs.length > 0 && (pairs.length * 2 + 1 > MAX_MESSAGES || size() > MAX_TOTAL_CHARS)) pairs.shift()

  return [...pairs.flat(), latest]
}

/** A turn handed to a new voice session as earlier context. Gemini calls the assistant role `model`. */
export type HistoryTurn = { role: 'user' | 'model'; text: string }

/** How much text a new voice session is seeded with: the most recent exchanges that fit. */
const MAX_VOICE_HISTORY_PAIRS = 20
const MAX_VOICE_HISTORY_CHARS = 12_000

/**
 * The completed exchanges to seed a voice session with, oldest first. Nothing is
 * added for the user's next utterance: that arrives as live audio, so it cannot be
 * sent twice. Partial, interrupted, failed and unanswered messages are excluded.
 */
export function toHistoryTurns(history: readonly ChatMessageData[]): HistoryTurn[] {
  const pairs = completedPairs(history)
  const size = () => pairs.reduce((sum, [a, b]) => sum + a.content.length + b.content.length, 0)
  while (pairs.length > 0 && (pairs.length > MAX_VOICE_HISTORY_PAIRS || size() > MAX_VOICE_HISTORY_CHARS)) pairs.shift()
  return pairs.flatMap(([user, assistant]): HistoryTurn[] => [
    { role: 'user', text: user.content },
    { role: 'model', text: assistant.content },
  ])
}

/**
 * Turn Gemini's plain-text reply into the blocks the chat renders: paragraphs
 * (separated by blank lines) and numbered lists ("1. ..." lines).
 */
export function replyToBlocks(reply: string): MessageBlock[] {
  const blocks: MessageBlock[] = []
  let paragraph: string[] = []
  let items: string[] = []

  const flushParagraph = () => {
    const text = paragraph.join('\n').trim()
    if (text) blocks.push({ type: 'paragraph', text })
    paragraph = []
  }
  const flushList = () => {
    if (items.length > 0) blocks.push({ type: 'list', items })
    items = []
  }

  for (const line of reply.split(/\r?\n/)) {
    const item = /^\s*\d+[.)]\s+(.*\S)\s*$/.exec(line)
    if (item) {
      flushParagraph()
      items.push(item[1])
      continue
    }
    flushList()
    if (line.trim() === '') flushParagraph()
    else paragraph.push(line)
  }
  flushParagraph()
  flushList()

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', text: reply.trim() }]
}

/** User-facing text for a failed chat request. The backend's own messages are already safe to show. */
export function describeChatError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'http':
        return error.message
      case 'api-not-configured':
        return 'The chat service is not configured. Set VITE_API_BASE_URL and restart the app.'
      case 'network':
        return 'Could not reach the chat service. Check that the backend is running, then try again.'
      case 'timeout':
        return 'The chat service took too long to respond. Please try again.'
      case 'invalid-response':
        return 'The chat service sent an unexpected response. Please try again.'
    }
  }
  return 'Something went wrong. Please try again.'
}
