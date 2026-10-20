import { createApp } from './app.js'
import { ConfigError, loadConfig } from './config.js'
import type { AppConfig } from './config.js'

let config: AppConfig
try {
  config = loadConfig()
} catch (error) {
  console.error(error instanceof ConfigError ? `Configuration error: ${error.message}` : error)
  process.exit(1)
}

const server = createApp(config).listen(config.port, config.host)

server.on('listening', () => {
  console.log(`aichatbot-gemini-backend listening on http://${config.host}:${config.port} (${config.nodeEnv})`)
  console.log(`CORS allowed origins: ${config.corsAllowedOrigins.join(', ')}`)
  console.log(
    config.gemini.apiKey
      ? `Gemini: API key configured | text model: ${config.gemini.model} | live (voice) model: ${config.gemini.liveModel}`
      : 'Gemini: GEMINI_API_KEY is not set, POST /api/chat and POST /api/live-token will answer 503',
  )
})

server.on('error', (error) => {
  console.error(`Server failed to start on port ${config.port}:`, error)
  process.exit(1)
})

// Render sends SIGTERM when it stops or replaces an instance.
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down.`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
