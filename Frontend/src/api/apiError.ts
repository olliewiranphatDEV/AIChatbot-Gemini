export type ApiErrorCode = 'api-not-configured' | 'network' | 'timeout' | 'http' | 'invalid-response'

export class ApiError extends Error {
  code: ApiErrorCode
  status?: number
  /** For `http` errors: the `error.code` the backend sent, such as `ai_rate_limited`. */
  serverCode?: string
  /** For `http` errors: how long the backend asked us to wait before trying again. */
  retryAfterSeconds?: number

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: { status?: number; serverCode?: string; retryAfterSeconds?: number; cause?: unknown },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'ApiError'
    this.code = code
    this.status = options?.status
    this.serverCode = options?.serverCode
    this.retryAfterSeconds = options?.retryAfterSeconds
  }
}
