import type { RequestHandler } from 'express'
import { HttpError } from './errors.js'

export type RateLimitOptions = {
  windowMs: number
  /** Allowed requests per client address inside the window. */
  maxPerClient: number
  /** Allowed requests from everyone together inside the window. */
  maxTotal: number
  /** Upper bound on remembered client addresses, so memory stays bounded. */
  maxTrackedClients?: number
  now?: () => number
}

/**
 * Small in-memory sliding-window limiter. It is a brake on accidental or casual
 * overuse of a costly endpoint, not authentication: addresses can be shared or
 * changed, and the counters reset when the server restarts or when several
 * instances run.
 */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const { windowMs, maxPerClient, maxTotal, maxTrackedClients = 5_000 } = options
  const now = options.now ?? Date.now
  const byClient = new Map<string, number[]>()
  let all: number[] = []

  const recent = (times: number[], cutoff: number) => {
    let start = 0
    while (start < times.length && times[start] <= cutoff) start += 1
    return start === 0 ? times : times.slice(start)
  }
  const wait = (oldest: number, current: number) => Math.max(1, Math.ceil((oldest + windowMs - current) / 1000))
  const tooMany = (seconds: number) =>
    new HttpError(429, 'rate_limited', `Too many voice sessions were started. Please wait ${seconds} seconds and try again.`, {
      retryAfterSeconds: seconds,
    })

  return (req, _res, next) => {
    const current = now()
    const cutoff = current - windowMs
    all = recent(all, cutoff)

    const key = req.ip ?? 'unknown'
    const times = recent(byClient.get(key) ?? [], cutoff)

    if (all.length >= maxTotal) return next(tooMany(wait(all[0], current)))
    if (times.length >= maxPerClient) return next(tooMany(wait(times[0], current)))

    if (!byClient.has(key) && byClient.size >= maxTrackedClients) {
      // Forget clients whose window has passed; if the table is still full, reject rather than grow.
      for (const [client, stamps] of byClient) if (recent(stamps, cutoff).length === 0) byClient.delete(client)
      if (byClient.size >= maxTrackedClients) return next(tooMany(wait(all[0] ?? current, current)))
    }

    times.push(current)
    all.push(current)
    byClient.set(key, times)
    return next()
  }
}
