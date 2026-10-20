import cors from 'cors'
import express from 'express'
import type { AppConfig } from './config.js'
import { createGeminiService } from './gemini.js'
import type { ReplyGenerator } from './gemini.js'
import { createLiveTokenService } from './live.js'
import type { LiveTokenIssuer } from './live.js'
import { errorHandler, notFound } from './middleware.js'
import { createRateLimiter } from './rateLimit.js'
import { createTranscriptionService } from './transcribe.js'
import type { Transcriber } from './transcribe.js'
import { createChatRouter } from './routes/chat.js'
import { healthRouter } from './routes/health.js'
import { createLiveRouter, LIVE_TOKEN_RATE_LIMIT } from './routes/live.js'
import { createTranscribeRouter, TRANSCRIBE_RATE_LIMIT } from './routes/transcribe.js'

/**
 * Build the Express app. Kept separate from server.ts so it can be tested without a port.
 * `deps` lets tests replace the Gemini services and the token rate limiter.
 */
export function createApp(
  config: AppConfig,
  deps: {
    gemini?: ReplyGenerator
    liveTokens?: LiveTokenIssuer
    liveTokenLimiter?: express.RequestHandler
    transcriber?: Transcriber
    transcribeLimiter?: express.RequestHandler
  } = {},
) {
  const app = express()
  app.disable('x-powered-by')
  // Behind a reverse proxy (Render) the socket address is the proxy's; this makes req.ip the real client.
  if (config.trustProxyHops > 0) app.set('trust proxy', config.trustProxyHops)

  const allowedOrigins = new Set(config.corsAllowedOrigins)
  app.use(
    cors({
      // Only browsers send Origin. Requests without it (curl, health checks) are
      // served normally; they just need no CORS headers.
      origin: (origin, callback) => callback(null, origin !== undefined && allowedOrigins.has(origin)),
      methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'],
      maxAge: 600,
    }),
  )

  // Raise the limit deliberately when a route genuinely needs larger bodies.
  app.use(express.json({ limit: '100kb' }))

  const gemini = deps.gemini ?? createGeminiService(config.gemini)
  const liveTokens = deps.liveTokens ?? createLiveTokenService(config.gemini)
  const liveTokenLimiter = deps.liveTokenLimiter ?? createRateLimiter(LIVE_TOKEN_RATE_LIMIT)
  const transcriber = deps.transcriber ?? createTranscriptionService(config.gemini)
  const transcribeLimiter = deps.transcribeLimiter ?? createRateLimiter(TRANSCRIBE_RATE_LIMIT)
  app.use('/api', healthRouter)
  app.use('/api', createChatRouter(gemini))
  app.use('/api', createLiveRouter(liveTokens, liveTokenLimiter))
  app.use('/api', createTranscribeRouter(transcriber, transcribeLimiter))
  app.use('/api', notFound)
  app.use(errorHandler)

  return app
}
