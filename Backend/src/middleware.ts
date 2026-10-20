import type { ErrorRequestHandler, RequestHandler } from 'express'
import { HttpError } from './errors.js'

type ErrorBody = { error: { code: string; message: string; retryAfterSeconds?: number } }

function errorBody(code: string, message: string, retryAfterSeconds?: number): ErrorBody {
  return { error: { code, message, ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }) } }
}

/** JSON 404 for any unknown route under /api. */
export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json(errorBody('not_found', 'API route not found.'))
}

/** Maps body-parser failures to client errors that are safe to describe. */
function describeClientError(error: { type?: unknown }): { code: string; message: string } {
  switch (error.type) {
    case 'entity.parse.failed':
      return { code: 'invalid_json', message: 'Request body is not valid JSON.' }
    case 'entity.too.large':
      return { code: 'payload_too_large', message: 'Request body is too large.' }
    default:
      return { code: 'bad_request', message: 'The request could not be processed.' }
  }
}

/**
 * Central error handler. Responses never include stack traces or internal
 * messages; the details of unexpected (5xx) failures are only logged server-side.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }

  // Deliberate, already-sanitised errors (validation, Gemini failures).
  if (error instanceof HttpError) {
    if (error.retryAfterSeconds !== undefined) res.set('Retry-After', String(error.retryAfterSeconds))
    res.status(error.status).json(errorBody(error.code, error.message, error.retryAfterSeconds))
    return
  }

  const candidate = (error ?? {}) as { status?: unknown; statusCode?: unknown; type?: unknown }
  const rawStatus = candidate.status ?? candidate.statusCode
  const status =
    typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500

  if (status >= 500) {
    console.error('Unhandled error:', error)
    res.status(500).json(errorBody('internal_error', 'Internal server error.'))
    return
  }

  const { code, message } = describeClientError(candidate)
  res.status(status).json(errorBody(code, message))
}
