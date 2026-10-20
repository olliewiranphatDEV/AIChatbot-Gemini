/**
 * An error whose status, code, and message were written by this server and are
 * safe to send to the browser as-is. Anything that is not an HttpError is treated
 * as unexpected and reported only as a generic 500.
 */
export class HttpError extends Error {
  readonly status: number
  readonly code: string
  /** When known, how long the caller should wait before trying again (sent as Retry-After). */
  readonly retryAfterSeconds?: number

  constructor(status: number, code: string, message: string, options: { retryAfterSeconds?: number } = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.retryAfterSeconds = options.retryAfterSeconds
  }
}
