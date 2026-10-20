import express, { Router } from 'express'
import type { RequestHandler } from 'express'
import { HttpError } from '../errors.js'
import { inspectWav, TRANSCRIBE_LIMITS } from '../transcribe.js'
import type { Transcriber } from '../transcribe.js'

/**
 * A transcription is a Gemini call that carries a recording, so it is throttled like the
 * voice token: 10 per client address per minute and 60 per minute overall. This is a
 * brake, not authentication (see README).
 */
export const TRANSCRIBE_RATE_LIMIT = { windowMs: 60_000, maxPerClient: 10, maxTotal: 60 } as const

export function createTranscribeRouter(transcriber: Transcriber, limiter: RequestHandler) {
  const router = Router()

  // The body is the WAV itself (no base64), read only after the throttle has accepted the request.
  router.post('/transcribe', limiter, express.raw({ type: 'audio/wav', limit: TRANSCRIBE_LIMITS.maxBytes }), async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new HttpError(415, 'unsupported_media_type', 'Send the recording as a WAV file with Content-Type: audio/wav.')
    }
    inspectWav(req.body)

    // Stop the Gemini call if the browser gives up (Cancel).
    const controller = new AbortController()
    const onClose = () => {
      if (!res.writableFinished) controller.abort()
    }
    res.on('close', onClose)
    try {
      const text = await transcriber.transcribe(req.body, { signal: controller.signal })
      if (controller.signal.aborted) return
      // The recording is not stored or logged; only the text goes back.
      res.status(200).json({ text })
    } catch (error) {
      if (controller.signal.aborted) return
      throw error
    } finally {
      res.off('close', onClose)
    }
  })

  return router
}
