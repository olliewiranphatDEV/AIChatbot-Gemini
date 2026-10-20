import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeChatError, replyToBlocks, toApiMessages, toHistoryTurns } from '../../src/api/chatMessages.ts'
import { ApiError } from '../../src/api/apiError.ts'
import type { ChatMessageData } from '../../src/types/chat.ts'

let n = 0
const user = (text: string, extra: Partial<ChatMessageData> = {}): ChatMessageData => ({ id: `u${(n += 1)}`, role: 'user', blocks: [{ type: 'paragraph', text }], ...extra })
const bot = (text: string, status: ChatMessageData['status'] = 'done', extra: Partial<ChatMessageData> = {}): ChatMessageData => ({
  id: `a${(n += 1)}`,
  role: 'assistant',
  status,
  blocks: text ? [{ type: 'paragraph', text }] : [],
  ...extra,
})

test('the /api/chat payload keeps role mapping and puts the new user message last', () => {
  const history = [user('q1'), bot('a1')]
  assert.deepEqual(toApiMessages(history, 'q2'), [
    { role: 'user', content: 'q1' },
    { role: 'assistant', content: 'a1' },
    { role: 'user', content: 'q2' },
  ])
})

test('failed, stopped and still-generating turns are excluded from the next request', () => {
  const history = [
    user('ok question'), bot('ok answer'),
    user('failed question'), bot('Could not reach the chat service.', 'error'),
    user('stopped question'), // cancelled: the empty reply was removed
    user('pending question'), bot('', 'generating'),
  ]
  assert.deepEqual(toApiMessages(history, 'next').map((m) => m.content), ['ok question', 'ok answer', 'next'])
})

test('spoken exchanges that completed are part of later text-chat context', () => {
  const history = [
    user('typed', {}), bot('typed reply'),
    user('spoken question', { source: 'voice', status: 'done' }), bot('spoken answer', 'done', { source: 'voice' }),
  ]
  assert.deepEqual(toApiMessages(history, 'follow-up').map((m) => m.content), ['typed', 'typed reply', 'spoken question', 'spoken answer', 'follow-up'])
})

test('partial, interrupted and unanswered voice turns are not sent as history', () => {
  const history = [
    user('cut off question', { source: 'voice', status: 'done' }), bot('half an ans', 'interrupted', { source: 'voice' }),
    user('still talking', { source: 'voice', status: 'streaming' }), bot('already answering', 'streaming', { source: 'voice' }),
    user('half heard', { source: 'voice', status: 'interrupted' }), bot('reply', 'done', { source: 'voice' }),
  ]
  assert.deepEqual(toApiMessages(history, 'next'), [{ role: 'user', content: 'next' }])
  assert.deepEqual(toHistoryTurns(history), [])
})

test('voice history lists completed exchanges oldest first, with Gemini role names, and nothing for the next utterance', () => {
  const history = [user('q1'), bot('a1'), user('unanswered')]
  assert.deepEqual(toHistoryTurns(history), [
    { role: 'user', text: 'q1' },
    { role: 'model', text: 'a1' },
  ])
  assert.deepEqual(toHistoryTurns([]), [])
})

test('voice history is bounded: the oldest exchanges are dropped first', () => {
  const history: ChatMessageData[] = []
  for (let i = 1; i <= 30; i += 1) history.push(user(`q${i}`), bot(`a${i}`))
  const turns = toHistoryTurns(history)
  assert.equal(turns.length, 40)
  assert.equal(turns[0].text, 'q11')
  assert.equal(turns.at(-1)?.text, 'a30')
})

test('text history is bounded by the backend limits and the newest exchanges survive', () => {
  const history: ChatMessageData[] = []
  for (let i = 1; i <= 40; i += 1) history.push(user(`q${i}`), bot(`a${i}`))
  const payload = toApiMessages(history, 'now')
  assert.ok(payload.length <= 50)
  assert.equal(payload.at(-1)?.content, 'now')
  assert.equal(payload.at(-2)?.content, 'a40')
  assert.equal(payload[0].role, 'user')
})

test('replies render as plain paragraphs and numbered lists, never as markup', () => {
  assert.deepEqual(replyToBlocks('<b>hi</b>\n\n1. one\n2. two'), [
    { type: 'paragraph', text: '<b>hi</b>' },
    { type: 'list', items: ['one', 'two'] },
  ])
})

test('chat errors: the backend message is shown as is and a rate limit is not turned into a daily-quota claim', () => {
  const limited = new ApiError('http', 'The AI service is rate limited right now. Please wait about 7 seconds and try again.', { status: 429, retryAfterSeconds: 7 })
  assert.equal(describeChatError(limited), limited.message)
  assert.ok(!/daily|quota/i.test(describeChatError(limited)))
  assert.match(describeChatError(new ApiError('network', 'x')), /Could not reach/)
  assert.equal(describeChatError(new Error('boom')), 'Something went wrong. Please try again.')
})
