import assert from 'node:assert/strict'
import { inspect } from 'node:util'
import { test } from 'node:test'
import { ConfigError, DEFAULT_GEMINI_LIVE_MODEL, DEFAULT_GEMINI_MODEL, parseConfig } from '../src/config.js'

const SECRET = 'AIzaSy-TEST-SECRET-KEY-123456'

test('Gemini defaults: Flash-Lite for text, 3.8 Live for voice, no key required to start', () => {
  const config = parseConfig({})
  assert.equal(config.gemini.model, DEFAULT_GEMINI_MODEL)
  assert.equal(config.gemini.model, 'gemini-3.5-flash-lite')
  assert.equal(config.gemini.liveModel, DEFAULT_GEMINI_LIVE_MODEL)
  assert.equal(config.gemini.liveModel, 'gemini-3.8-live')
  assert.equal(config.gemini.apiKey, undefined)
})

test('GEMINI_MODEL overrides the default and is trimmed', () => {
  assert.equal(parseConfig({ GEMINI_MODEL: ' gemini-3.8-flash ' }).gemini.model, 'gemini-3.8-flash')
  assert.equal(parseConfig({ GEMINI_MODEL: '   ' }).gemini.model, DEFAULT_GEMINI_MODEL)
})

test('invalid GEMINI_MODEL / GEMINI_LIVE_MODEL are rejected', () => {
  for (const bad of ['models/../x', 'a b', 'x?key=1', '-flash', 'gemini/3']) {
    assert.throws(() => parseConfig({ GEMINI_MODEL: bad }), ConfigError, bad)
    assert.throws(() => parseConfig({ GEMINI_LIVE_MODEL: bad }), ConfigError, bad)
  }
})

test('the two models are configured independently, and an existing env value beats the default', () => {
  const config = parseConfig({ GEMINI_MODEL: 'gemini-3.8-flash', GEMINI_LIVE_MODEL: 'gemini-live-other' })
  assert.equal(config.gemini.model, 'gemini-3.8-flash')
  assert.equal(config.gemini.liveModel, 'gemini-live-other')
  assert.equal(parseConfig({ GEMINI_LIVE_MODEL: 'gemini-live-other' }).gemini.model, DEFAULT_GEMINI_MODEL)
})

test('TRUST_PROXY_HOPS: default 0, accepts 0-9, rejects anything else', () => {
  assert.equal(parseConfig({}).trustProxyHops, 0)
  assert.equal(parseConfig({ TRUST_PROXY_HOPS: '1' }).trustProxyHops, 1)
  for (const bad of ['-1', 'x', '10', '1.5']) assert.throws(() => parseConfig({ TRUST_PROXY_HOPS: bad }), ConfigError, bad)
})

test('GEMINI_API_KEY is read (trimmed) but never visible when the config is printed or serialised', () => {
  const config = parseConfig({ GEMINI_API_KEY: `  ${SECRET}  ` })
  assert.equal(config.gemini.apiKey, SECRET)
  assert.ok(!JSON.stringify(config).includes(SECRET), 'JSON.stringify leaked the key')
  assert.ok(!inspect(config, { depth: 5, showHidden: false }).includes(SECRET), 'util.inspect leaked the key')
  assert.ok(!String(JSON.stringify(config.gemini)).includes('apiKey'))
})

test('empty GEMINI_API_KEY counts as not configured', () => {
  assert.equal(parseConfig({ GEMINI_API_KEY: '   ' }).gemini.apiKey, undefined)
})

test('metadata variables are ignored and never required', () => {
  const config = parseConfig({
    GEMINI_API_NAME: 'my key name',
    GEMINI_API_PROJECT_NAME: 'my project',
    GEMINI_API_PROJECT_NUMBER: '123456',
  })
  assert.equal(config.gemini.apiKey, undefined)
  assert.equal(config.gemini.model, DEFAULT_GEMINI_MODEL)
  assert.deepEqual(Object.keys(config.gemini), ['model', 'liveModel'])
})
