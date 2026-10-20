import { Router } from 'express'
import type { RequestHandler } from 'express'
import type { LiveTokenIssuer } from '../live.js'

/**
 * Starting a voice session costs a Gemini call, so token requests are throttled:
 * 5 per client address per minute and 60 per minute overall.
 */
export const LIVE_TOKEN_RATE_LIMIT = { windowMs: 60_000, maxPerClient: 5, maxTotal: 60 } as const

export function createLiveRouter(issuer: LiveTokenIssuer, limiter: RequestHandler) {
  const router = Router()

  router.post('/live-token', limiter, async (_req, res) => {
    const token = await issuer.createToken()
    // The response carries a credential: it must never be stored by browsers or proxies.
    res.set({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', Expires: '0' })
    res.status(200).json(token)
  })

  return router
}
