import { ApiError as GenAiApiError } from '@google/genai'
import { HttpError } from './errors.js'

/**
 * The only fields ever taken from a Gemini error for logging. Everything else
 * (message text, request details, headers, tokens, keys) is deliberately dropped.
 */
export type UpstreamDiagnostics = {
  httpStatus?: number
  /** Google status name such as RESOURCE_EXHAUSTED. */
  providerStatus?: string
  /** ErrorInfo reason such as RATE_LIMIT_EXCEEDED or API_KEY_INVALID. */
  reason?: string
  quotaMetric?: string
  quotaId?: string
  retryAfterSeconds?: number
}

const STATUS_NAME = /^[A-Z][A-Z0-9_]{2,39}$/
const QUOTA_NAME = /^[A-Za-z0-9][A-Za-z0-9._\-/:]{0,119}$/

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined
const matching = (value: unknown, pattern: RegExp): string | undefined =>
  typeof value === 'string' && pattern.test(value) ? value : undefined

/** "23s" or "23.4s" (a protobuf Duration) -> whole seconds, bounded to 1 hour. */
export function parseRetryDelay(value: unknown): number | undefined {
  const match = typeof value === 'string' ? /^(\d+(?:\.\d+)?)s$/.exec(value) : null
  if (!match) return undefined
  return Math.min(3600, Math.max(1, Math.ceil(Number(match[1]))))
}

/**
 * Pull the allowlisted diagnostic fields out of an SDK error. The SDK stores the
 * provider's JSON error body in `error.message`; it is parsed here and only the
 * fields above survive, each checked against a strict pattern.
 */
export function describeUpstreamError(error: unknown): UpstreamDiagnostics {
  if (!(error instanceof GenAiApiError)) return {}
  const diagnostics: UpstreamDiagnostics = { httpStatus: error.status }

  let body: Record<string, unknown> | undefined
  try {
    body = asRecord(asRecord(JSON.parse(error.message))?.error)
  } catch {
    return diagnostics
  }
  diagnostics.providerStatus = matching(body?.status, STATUS_NAME)

  const details = Array.isArray(body?.details) ? body.details : []
  for (const raw of details) {
    const detail = asRecord(raw)
    const type = typeof detail?.['@type'] === 'string' ? detail['@type'] : ''
    if (type.endsWith('.QuotaFailure')) {
      const violation = asRecord(Array.isArray(detail?.violations) ? detail.violations[0] : undefined)
      diagnostics.quotaMetric ??= matching(violation?.quotaMetric, QUOTA_NAME)
      diagnostics.quotaId ??= matching(violation?.quotaId, QUOTA_NAME)
    } else if (type.endsWith('.RetryInfo')) {
      diagnostics.retryAfterSeconds ??= parseRetryDelay(detail?.retryDelay)
    } else if (type.endsWith('.ErrorInfo')) {
      diagnostics.reason ??= matching(detail?.reason, STATUS_NAME)
    }
  }
  return Object.fromEntries(Object.entries(diagnostics).filter(([, value]) => value !== undefined)) as UpstreamDiagnostics
}

/**
 * Turn anything thrown while calling Gemini into a client-safe error. Provider
 * messages, stack traces, and request details are never copied into the result.
 */
export function toChatError(error: unknown, timedOut = false): HttpError {
  if (error instanceof HttpError) return error
  if (timedOut) return new HttpError(504, 'ai_timeout', 'The AI took too long to respond. Please try again.')

  if (error instanceof GenAiApiError) {
    const { status } = error
    // Gemini reports an invalid key as 400 INVALID_ARGUMENT; the message is only used to classify.
    const rejectedKey = status === 400 && /api[_ ]?key/i.test(error.message)
    if (status === 401 || status === 403 || rejectedKey) {
      return new HttpError(502, 'ai_auth_failed', "The AI service rejected the server's credentials.")
    }
    if (status === 404) {
      return new HttpError(502, 'ai_model_unavailable', 'The configured AI model is not available.')
    }
    if (status === 429) {
      // A 429 can be a per-minute, per-day, or shared-capacity limit; do not guess which.
      const { retryAfterSeconds } = describeUpstreamError(error)
      const wait = retryAfterSeconds ? `about ${retryAfterSeconds} seconds` : 'a moment'
      return new HttpError(
        429,
        'ai_rate_limited',
        `The AI service is rate limited right now. Please wait ${wait} and try again.`,
        { retryAfterSeconds },
      )
    }
    if (status === 408 || status === 504) {
      return new HttpError(504, 'ai_timeout', 'The AI took too long to respond. Please try again.')
    }
    if (status >= 500) {
      return new HttpError(502, 'ai_unavailable', 'The AI service is temporarily unavailable. Please try again.')
    }
    return new HttpError(502, 'ai_error', 'The AI service could not process the request.')
  }

  return new HttpError(502, 'ai_unavailable', 'Could not reach the AI service. Please try again.')
}

/** One log line per failed upstream call: the mapped code, the model, and allowlisted fields only. */
export function logUpstreamFailure(operation: string, model: string, error: unknown, mapped: HttpError): void {
  const diagnostics = describeUpstreamError(error)
  console.error(`Gemini ${operation} failed [model ${model}]: ${mapped.code} ${JSON.stringify(diagnostics)}`)
}
