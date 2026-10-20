import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ChatMessageData } from '../../src/types/chat.ts'
import { applyTranscriptEvent, emptyCursor } from '../../src/voice/transcript.ts'
import type { TranscriptCursor, TranscriptEvent } from '../../src/voice/transcript.ts'

function play(events: TranscriptEvent[], start: ChatMessageData[] = [], cursor: TranscriptCursor = emptyCursor) {
  let n = 0
  let messages = start
  let current = cursor
  for (const event of events) {
    const result = applyTranscriptEvent(messages, current, event, () => `v${(n += 1)}`, '2:14 PM')
    messages = result.messages
    current = result.cursor
  }
  return { messages, cursor: current }
}
const text = (m: ChatMessageData) => (m.blocks[0]?.type === 'paragraph' ? m.blocks[0].text : '')
const summary = (messages: ChatMessageData[]) => messages.map((m) => `${m.role}:${m.status}:${text(m)}`)

test('chunks of one turn update one bubble per side in place (no bubble per chunk)', () => {
  const { messages } = play([
    { type: 'input', text: 'สวัสดี' },
    { type: 'input', text: 'ครับ' },
    { type: 'output', text: 'สวัสดี' },
    { type: 'output', text: 'ค่ะ มีอะไรให้ช่วย' },
  ])
  assert.deepEqual(summary(messages), ['user:done:สวัสดีครับ', 'assistant:streaming:สวัสดีค่ะ มีอะไรให้ช่วย'])
  assert.equal(messages[0].source, 'voice')
  assert.equal(messages[0].sentAt, '2:14 PM')
})

test('English chunks keep the spaces Gemini sends', () => {
  const { messages } = play([{ type: 'input', text: 'What is' }, { type: 'input', text: ' the moon' }, { type: 'turn-complete' }])
  assert.deepEqual(summary(messages), ['user:done:What is the moon'])
})

test('turn-complete finishes both messages and the next turn starts new bubbles', () => {
  const { messages, cursor } = play([
    { type: 'input', text: 'one' },
    { type: 'output', text: 'reply one' },
    { type: 'turn-complete' },
    { type: 'input', text: 'two' },
    { type: 'output', text: 'reply two' },
    { type: 'turn-complete' },
  ])
  assert.deepEqual(summary(messages), ['user:done:one', 'assistant:done:reply one', 'user:done:two', 'assistant:done:reply two'])
  assert.deepEqual(cursor, {})
})

test('a late user chunk after the AI started answering stays in the user message above it', () => {
  const { messages } = play([{ type: 'input', text: 'hello' }, { type: 'output', text: 'Hi' }, { type: 'input', text: ' there' }])
  assert.deepEqual(summary(messages), ['user:done:hello there', 'assistant:streaming:Hi'])
})

test('barge-in: the cut-off reply is kept but marked interrupted, and the new question gets its own bubble', () => {
  const { messages } = play([
    { type: 'input', text: 'tell me a story' },
    { type: 'output', text: 'Once upon' },
    { type: 'interrupted' },
    { type: 'input', text: 'stop' },
    { type: 'output', text: 'Okay.' },
    { type: 'turn-complete' },
  ])
  assert.deepEqual(summary(messages), ['user:done:tell me a story', 'assistant:interrupted:Once upon', 'user:done:stop', 'assistant:done:Okay.'])
})

test('interrupted before any answer keeps the words said so far in the same user message', () => {
  const { messages } = play([{ type: 'input', text: 'hel' }, { type: 'interrupted' }, { type: 'input', text: 'lo' }, { type: 'turn-complete' }])
  assert.deepEqual(summary(messages), ['user:done:hello'])
})

test('turn-complete, interrupted and close with no transcribed text leave nothing behind', () => {
  const { messages } = play([{ type: 'turn-complete' }, { type: 'interrupted' }, { type: 'close' }])
  assert.deepEqual(messages, [])
})

test('closing the session marks anything still streaming as interrupted; completed messages are untouched', () => {
  const { messages, cursor } = play([
    { type: 'input', text: 'done question' },
    { type: 'output', text: 'done answer' },
    { type: 'turn-complete' },
    { type: 'input', text: 'half a quest' },
    { type: 'close' },
  ])
  assert.deepEqual(summary(messages), ['user:done:done question', 'assistant:done:done answer', 'user:interrupted:half a quest'])
  assert.deepEqual(cursor, {})
})

test('events change only the messages they are given: another conversation is untouched', () => {
  const other: ChatMessageData[] = [{ id: 'a', role: 'user', status: 'done', blocks: [{ type: 'paragraph', text: 'typed earlier' }] }]
  const snapshot = JSON.stringify(other)
  const { messages } = play([{ type: 'input', text: 'voice words' }, { type: 'turn-complete' }])
  assert.deepEqual(summary(messages), ['user:done:voice words'])
  assert.equal(JSON.stringify(other), snapshot)
})

test('typed messages already in the conversation are preserved and ordered before the voice turn', () => {
  const typed: ChatMessageData[] = [
    { id: 't1', role: 'user', blocks: [{ type: 'paragraph', text: 'typed' }] },
    { id: 't2', role: 'assistant', status: 'done', blocks: [{ type: 'paragraph', text: 'typed reply' }] },
  ]
  const { messages } = play([{ type: 'input', text: 'spoken' }, { type: 'turn-complete' }], typed)
  assert.deepEqual(messages.map((m) => m.id), ['t1', 't2', 'v1'])
})

test('empty chunks are ignored', () => {
  const { messages } = play([{ type: 'input', text: '' }, { type: 'output', text: '' }])
  assert.deepEqual(messages, [])
})
