import { Router } from 'express'

export const healthRouter = Router()

// Deliberately independent of Gemini, Firebase Admin, or any database, so it can
// answer as soon as the process is up (also useful as a Render health check).
healthRouter.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'aichatbot-gemini-backend' })
})
