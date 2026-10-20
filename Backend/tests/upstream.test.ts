import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApiError } from '@google/genai'
import { HttpError } from '../src/errors.js'
import { describeUpstreamError, logUpstreamFailure, parseRetryDelay, toChatError } from '../src/upstream.js'

const SECRET = 'AIzaSy-TEST-SECRET-KEY-123456'

const quotaBody = {
  error: {
    code: 429,
    message: `You exceeded your current quota for key ${SECRET}. User said: my private question`,
    status: 'RESOURCE_EXHAUSTED',
    details: [
      { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'RATE_LIMIT_EXCEEDED', metadata: { secret: SECRET } },
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [
          {
            quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests',
            quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier',
            quotaDimensions: { model: 'gemini-3.5-flash-lite', location: 'global' },
            description: `contains ${SECRET}`,
          },
        ],
      },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '23.4s' },
    ],
  },
}
const sdk429 = () => new ApiError({ status: 429, message: JSON.stringify(quotaBody) })

test('parseRetryDelay: whole seconds, at least 1, at most one hour, junk ignored', () => {
  assert.equal(parseRetryDelay('23s'), 23)
  assert.equal(parseRetryDelay('23.2s'), 24)
  assert.equal(parseRetryDelay('0.4s'), 1)
  assert.equal(parseRetryDelay('99999s'), 3600)
  for (const bad of ['abc', '', '23', '-5s', '5 seconds', undefined, 12, null]) assert.equal(parseRetryDelay(bad), undefined)
})

test('describeUpstreamError keeps only the allowlisted diagnostic fields', () => {
  assert.deepEqual(describeUpstreamError(sdk429()), {
    httpStatus: 429,
    providerStatus: 'RESOURCE_EXHAUSTED',
    reason: 'RATE_LIMIT_EXCEEDED',
    quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests',
    quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier',
    retryAfterSeconds: 24,
  })
})

test('the diagnostics never contain provider message text, metadata, or the key', () => {
  const text = JSON.stringify(describeUpstreamError(sdk429()))
  assert.ok(!text.includes(SECRET))
  assert.ok(!/private question|exceeded your current quota|metadata|description/.test(text))
})

test('values that do not match the strict patterns are dropped', () => {
  const body = {
    error: {
      status: 'lowercase status with spaces',
      details: [
        { '@type': 'x.QuotaFailure', violations: [{ quotaMetric: `has spaces and ${SECRET}`, quotaId: 'a'.repeat(500) }] },
        { '@type': 'x.RetryInfo', retryDelay: 'soon' },
        { '@type': 'x.ErrorInfo', reason: 'not an enum name' },
      ],
    },
  }
  assert.deepEqual(describeUpstreamError(new ApiError({ status: 500, message: JSON.stringify(body) })), { httpStatus: 500 })
})

test('describeUpstreamError copes with non-JSON messages and with errors that are not SDK errors', () => {
  assert.deepEqual(describeUpstreamError(new ApiError({ status: 503, message: '<html>gateway</html>' })), { httpStatus: 503 })
  assert.deepEqual(describeUpstreamError(new ApiError({ status: 500, message: 'null' })), { httpStatus: 500 })
  assert.deepEqual(describeUpstreamError(new TypeError('fetch failed')), {})
  assert.deepEqual(describeUpstreamError(undefined), {})
})

test('429 is reported as a rate limit with the provider retry delay, not as exhausted daily quota', () => {
  const mapped = toChatError(sdk429())
  assert.equal(mapped.status, 429)
  assert.equal(mapped.code, 'ai_rate_limited')
  assert.equal(mapped.retryAfterSeconds, 24)
  assert.match(mapped.message, /rate limited/)
  assert.match(mapped.message, /about 24 seconds/)
  assert.ok(!/daily|per day|exhausted|used up/i.test(mapped.message), mapped.message)
})

test('429 without retry guidance asks the user to wait a moment and sets no retry time', () => {
  const mapped = toChatError(new ApiError({ status: 429, message: '{"error":{"status":"RESOURCE_EXHAUSTED"}}' }))
  assert.equal(mapped.retryAfterSeconds, undefined)
  assert.match(mapped.message, /wait a moment/)
})

test('logUpstreamFailure writes one line with the model and allowlisted fields only', () => {
  const lines: string[] = []
  const original = console.error
  console.error = (...args: unknown[]) => lines.push(args.map(String).join(' '))
  try {
    logUpstreamFailure('live token', 'gemini-3.8-live', sdk429(), toChatError(sdk429()))
  } finally {
    console.error = original
  }
  assert.equal(lines.length, 1)
  assert.match(lines[0], /^Gemini live token failed \[model gemini-3\.8-live\]: ai_rate_limited \{/)
  assert.match(lines[0], /"quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier"/)
  assert.match(lines[0], /"retryAfterSeconds":24/)
  assert.ok(!lines[0].includes(SECRET))
  assert.ok(!/private question|Authorization|Bearer|\bat /.test(lines[0]))
})

test('an HttpError passes through unchanged', () => {
  const own = new HttpError(422, 'ai_response_blocked', 'x')
  assert.equal(toChatError(own), own)
})
