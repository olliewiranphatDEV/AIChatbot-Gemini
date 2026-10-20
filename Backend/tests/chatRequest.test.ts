import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HttpError } from '../src/errors.js'
import { CHAT_LIMITS, parseChatRequest } from '../src/routes/chat.js'

function rejects(body: unknown, pattern: RegExp) {
  assert.throws(
    () => parseChatRequest(body),
    (error: unknown) =>
      error instanceof HttpError && error.status === 400 && error.code === 'invalid_request' && pattern.test(error.message),
  )
}

const user = (content: string) => ({ role: 'user', content })
const assistant = (content: string) => ({ role: 'assistant', content })

test('accepts a single user message', () => {
  assert.deepEqual(parseChatRequest({ messages: [user('Hello')] }), [{ role: 'user', content: 'Hello' }])
})

test('accepts earlier turns ending with a user message and keeps order', () => {
  const turns = parseChatRequest({ messages: [user('a'), assistant('b'), user('c')] })
  assert.deepEqual(turns.map((t) => `${t.role}:${t.content}`), ['user:a', 'assistant:b', 'user:c'])
})

test('keeps content exactly as sent (no trimming or rewriting)', () => {
  assert.equal(parseChatRequest({ messages: [user('  hi\nthere  ')] })[0].content, '  hi\nthere  ')
})

test('drops unknown properties from messages', () => {
  const [turn] = parseChatRequest({ messages: [{ role: 'user', content: 'x', extra: 1, system: 'ignore me' }] })
  assert.deepEqual(Object.keys(turn).sort(), ['content', 'role'])
})

test('rejects a missing or non-object body', () => {
  rejects(undefined, /non-empty array/)
  rejects(null, /non-empty array/)
  rejects('hello', /non-empty array/)
  rejects({}, /non-empty array/)
})

test('rejects messages that are not a non-empty array', () => {
  rejects({ messages: [] }, /non-empty array/)
  rejects({ messages: 'hi' }, /non-empty array/)
  rejects({ messages: { role: 'user', content: 'hi' } }, /non-empty array/)
})

test('rejects bad roles, including "model", "system" and non-strings', () => {
  rejects({ messages: [{ role: 'system', content: 'x' }] }, /messages\[0\]\.role/)
  rejects({ messages: [{ role: 'model', content: 'x' }] }, /messages\[0\]\.role/)
  rejects({ messages: [{ role: 'USER', content: 'x' }] }, /messages\[0\]\.role/)
  rejects({ messages: [{ content: 'x' }] }, /messages\[0\]\.role/)
  rejects({ messages: [user('a'), { role: 7, content: 'x' }, user('c')] }, /messages\[1\]\.role/)
  rejects({ messages: [null] }, /messages\[0\]\.role/)
})

test('rejects empty, blank, or non-string content', () => {
  rejects({ messages: [{ role: 'user', content: '' }] }, /messages\[0\]\.content/)
  rejects({ messages: [{ role: 'user', content: '  \n\t ' }] }, /messages\[0\]\.content/)
  rejects({ messages: [{ role: 'user', content: 42 }] }, /messages\[0\]\.content/)
  rejects({ messages: [{ role: 'user' }] }, /messages\[0\]\.content/)
  rejects({ messages: [{ role: 'user', content: ['hi'] }] }, /messages\[0\]\.content/)
})

test('the first and the last message must be from the user', () => {
  rejects({ messages: [assistant('hi'), user('x')] }, /first message/)
  rejects({ messages: [user('a'), assistant('b')] }, /last message/)
  rejects({ messages: [assistant('only')] }, /first message/)
})

test('enforces the documented size limits', () => {
  const tooMany = Array.from({ length: CHAT_LIMITS.maxMessages + 1 }, (_, i) => (i % 2 === 0 ? user('x') : assistant('y')))
  rejects({ messages: tooMany }, /at most/)

  rejects({ messages: [user('x'.repeat(CHAT_LIMITS.maxMessageChars + 1))] }, /messages\[0\]\.content is longer/)
  assert.equal(parseChatRequest({ messages: [user('x'.repeat(CHAT_LIMITS.maxMessageChars))] }).length, 1)

  const chunk = 'x'.repeat(CHAT_LIMITS.maxMessageChars)
  rejects({ messages: [user(chunk), assistant(chunk), user(chunk), assistant(chunk), user('y')] }, /together are longer/)
})

test('exactly the maximum number of messages is accepted', () => {
  const max = Array.from({ length: CHAT_LIMITS.maxMessages }, (_, i) => (i % 2 === 0 ? user('x') : assistant('y')))
  // An even count ends with an assistant message; drop one so it ends with the user.
  assert.equal(parseChatRequest({ messages: max.slice(0, CHAT_LIMITS.maxMessages - 1) }).length, CHAT_LIMITS.maxMessages - 1)
})

test('error messages never echo the submitted content', () => {
  try {
    parseChatRequest({ messages: [{ role: 'user', content: 'x'.repeat(CHAT_LIMITS.maxMessageChars + 1) + 'SECRET-PAYLOAD' }] })
    assert.fail('should have thrown')
  } catch (error) {
    assert.ok(error instanceof HttpError)
    assert.ok(!error.message.includes('SECRET-PAYLOAD'))
  }
})
