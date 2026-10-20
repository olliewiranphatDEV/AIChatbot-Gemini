import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Request, Response } from 'express'
import { HttpError } from '../src/errors.js'
import { createRateLimiter } from '../src/rateLimit.js'

function harness(options: Parameters<typeof createRateLimiter>[0]) {
  const limiter = createRateLimiter(options)
  return (ip: string | undefined) => {
    let outcome: unknown = 'not called'
    limiter({ ip } as Request, {} as Response, (error?: unknown) => {
      outcome = error ?? 'allowed'
    })
    return outcome
  }
}

const isLimited = (outcome: unknown) => outcome instanceof HttpError && outcome.status === 429 && outcome.code === 'rate_limited'

test('allows up to the per-client limit, then rejects with a retry time', () => {
  let t = 1_000_000
  const hit = harness({ windowMs: 60_000, maxPerClient: 3, maxTotal: 100, now: () => t })
  assert.equal(hit('1.1.1.1'), 'allowed')
  assert.equal(hit('1.1.1.1'), 'allowed')
  assert.equal(hit('1.1.1.1'), 'allowed')
  t += 10_000
  const fourth = hit('1.1.1.1')
  assert.ok(isLimited(fourth))
  assert.equal((fourth as HttpError).retryAfterSeconds, 50)
  assert.match((fourth as HttpError).message, /wait 50 seconds/)
})

test('clients are limited independently', () => {
  const hit = harness({ windowMs: 60_000, maxPerClient: 1, maxTotal: 100, now: () => 5 })
  assert.equal(hit('1.1.1.1'), 'allowed')
  assert.ok(isLimited(hit('1.1.1.1')))
  assert.equal(hit('2.2.2.2'), 'allowed')
})

test('the window slides: capacity returns as old requests expire', () => {
  let t = 0
  const hit = harness({ windowMs: 60_000, maxPerClient: 2, maxTotal: 100, now: () => t })
  assert.equal(hit('a'), 'allowed')
  t = 30_000
  assert.equal(hit('a'), 'allowed')
  t = 59_999
  assert.ok(isLimited(hit('a')))
  t = 60_001 // the first request has left the window
  assert.equal(hit('a'), 'allowed')
  assert.ok(isLimited(hit('a')))
})

test('a global cap applies across all clients', () => {
  const hit = harness({ windowMs: 60_000, maxPerClient: 10, maxTotal: 3, now: () => 1 })
  assert.equal(hit('a'), 'allowed')
  assert.equal(hit('b'), 'allowed')
  assert.equal(hit('c'), 'allowed')
  assert.ok(isLimited(hit('d')))
})

test('rejected requests do not extend the penalty (only accepted ones are counted)', () => {
  let t = 0
  const hit = harness({ windowMs: 60_000, maxPerClient: 1, maxTotal: 100, now: () => t })
  assert.equal(hit('a'), 'allowed')
  for (let i = 0; i < 20; i += 1) {
    t += 1000
    assert.ok(isLimited(hit('a')))
  }
  t = 60_500
  assert.equal(hit('a'), 'allowed')
})

test('memory stays bounded: unknown addresses are refused once the table is full', () => {
  const hit = harness({ windowMs: 60_000, maxPerClient: 5, maxTotal: 1000, maxTrackedClients: 3, now: () => 1 })
  assert.equal(hit('a'), 'allowed')
  assert.equal(hit('b'), 'allowed')
  assert.equal(hit('c'), 'allowed')
  assert.ok(isLimited(hit('d')))
  assert.equal(hit('a'), 'allowed') // known clients keep working
})

test('expired clients are forgotten so the table does not stay full', () => {
  let t = 0
  const hit = harness({ windowMs: 1000, maxPerClient: 5, maxTotal: 1000, maxTrackedClients: 2, now: () => t })
  assert.equal(hit('a'), 'allowed')
  assert.equal(hit('b'), 'allowed')
  t = 2000
  assert.equal(hit('c'), 'allowed')
})

test('requests with no address share one bucket instead of bypassing the limit', () => {
  const hit = harness({ windowMs: 60_000, maxPerClient: 1, maxTotal: 100, now: () => 1 })
  assert.equal(hit(undefined), 'allowed')
  assert.ok(isLimited(hit(undefined)))
})
