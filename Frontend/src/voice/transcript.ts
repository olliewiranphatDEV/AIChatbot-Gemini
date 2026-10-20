// Turns Live API transcription events into chat messages. Pure, so de-duplication,
// ordering and interruption handling are unit-tested without a browser or a socket.
//
// Gemini sends transcription as small increments. They are appended to ONE message per
// turn and side, so a spoken turn never produces a bubble per chunk. A message stays
// `streaming` until its turn is over:
//   - `done`         the turn completed (user finished speaking / `turnComplete`)
//   - `interrupted`  cut off by the user speaking over the AI, or the session ending
// Interrupted and still-streaming messages are shown, but are not completed history.

import type { ChatMessageData } from '../types/chat.ts'

export type TranscriptEvent =
  | { type: 'input'; text: string }
  | { type: 'output'; text: string }
  | { type: 'interrupted' }
  | { type: 'turn-complete' }
  /** The session is over (ended by the user, the server, or an error): close anything still streaming. */
  | { type: 'close' }

/** The messages of the current turn. Lives next to the message list for as long as a session runs. */
export type TranscriptCursor = { userId?: string; assistantId?: string }

export const emptyCursor: TranscriptCursor = {}

export type TranscriptResult = { messages: ChatMessageData[]; cursor: TranscriptCursor }

const hasText = (message: ChatMessageData) => message.blocks.some((block) => block.type === 'paragraph' && block.text.trim() !== '')

function appendText(message: ChatMessageData, text: string): ChatMessageData {
  const first = message.blocks[0]
  const current = first?.type === 'paragraph' ? first.text : ''
  return { ...message, blocks: [{ type: 'paragraph', text: current + text }] }
}

function patch(messages: ChatMessageData[], id: string | undefined, change: (message: ChatMessageData) => ChatMessageData | null): ChatMessageData[] {
  if (!id) return messages
  const next: ChatMessageData[] = []
  for (const message of messages) {
    if (message.id !== id) {
      next.push(message)
      continue
    }
    const changed = change(message)
    if (changed) next.push(changed)
  }
  return next
}

/** Marks a streaming message finished, or removes it when nothing was ever transcribed. */
const settle = (status: 'done' | 'interrupted') => (message: ChatMessageData) => {
  if (message.status !== 'streaming') return message
  return hasText(message) ? { ...message, status } : null
}

/**
 * Apply one event. `newId` supplies an id for a message created by the event and
 * `sentAt` the time label for a new user message.
 */
export function applyTranscriptEvent(
  messages: ChatMessageData[],
  cursor: TranscriptCursor,
  event: TranscriptEvent,
  newId: () => string,
  sentAt?: string,
): TranscriptResult {
  switch (event.type) {
    case 'input': {
      if (event.text === '') return { messages, cursor }
      if (cursor.userId && messages.some((m) => m.id === cursor.userId)) {
        // Same turn: append. A late chunk that arrives after the AI started answering still
        // belongs to the user's message above it, not to a new bubble below the answer.
        return { messages: patch(messages, cursor.userId, (m) => appendText(m, event.text)), cursor }
      }
      const user: ChatMessageData = {
        id: newId(),
        role: 'user',
        source: 'voice',
        status: 'streaming',
        sentAt,
        blocks: [{ type: 'paragraph', text: event.text }],
      }
      return { messages: [...messages, user], cursor: { ...cursor, userId: user.id } }
    }
    case 'output': {
      if (event.text === '') return { messages, cursor }
      // The AI has started answering, so the user's utterance is complete.
      const settled = patch(messages, cursor.userId, settle('done'))
      if (cursor.assistantId && settled.some((m) => m.id === cursor.assistantId)) {
        return { messages: patch(settled, cursor.assistantId, (m) => appendText(m, event.text)), cursor }
      }
      const assistant: ChatMessageData = {
        id: newId(),
        role: 'assistant',
        source: 'voice',
        status: 'streaming',
        blocks: [{ type: 'paragraph', text: event.text }],
      }
      return { messages: [...settled, assistant], cursor: { ...cursor, assistantId: assistant.id } }
    }
    case 'interrupted': {
      // The user spoke over the AI: what it had said so far stays visible, marked as cut off.
      // If the AI had not answered yet, the user's words so far belong to the turn that is now starting.
      const next = patch(messages, cursor.assistantId, settle('interrupted'))
      return { messages: next, cursor: cursor.assistantId ? {} : { userId: cursor.userId } }
    }
    case 'turn-complete': {
      let next = patch(messages, cursor.userId, settle('done'))
      next = patch(next, cursor.assistantId, settle('done'))
      return { messages: next, cursor: {} }
    }
    case 'close': {
      let next = patch(messages, cursor.userId, settle('interrupted'))
      next = patch(next, cursor.assistantId, settle('interrupted'))
      return { messages: next, cursor: {} }
    }
  }
}
