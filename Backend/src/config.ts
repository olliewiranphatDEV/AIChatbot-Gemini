import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

export type AppConfig = {
  nodeEnv: string
  isProduction: boolean
  /** Bind to every interface so a hosting platform (Render) can reach the server. */
  host: string
  port: number
  /** Exact browser origins allowed by CORS. Never contains a wildcard. */
  corsAllowedOrigins: readonly string[]
  /**
   * How many reverse-proxy hops sit in front of the server (Render: 1). Express uses it
   * to find the real client address, which the token rate limit is keyed on.
   */
  trustProxyHops: number
  gemini: GeminiSettings
}

export type GeminiSettings = {
  /** Gemini Developer API model ID used for typed chat replies. */
  readonly model: string
  /** Gemini Live API model ID used for spoken conversations. */
  readonly liveModel: string
  /**
   * Server-side secret. Defined as a non-enumerable property, so logging or
   * serialising the config (console.log, JSON.stringify) can never print it.
   */
  readonly apiKey?: string
}

const DEFAULT_PORT = 3001
const DEFAULT_DEV_ORIGIN = 'http://localhost:5173'
/** Text chat: Flash-Lite model that is stable and has a documented free tier. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'
/** Voice chat: the stable Gemini Live model with a documented free tier. */
export const DEFAULT_GEMINI_LIVE_MODEL = 'gemini-3.8-live'

export class ConfigError extends Error {}

function parsePort(value: string | undefined): number {
  const raw = value?.trim()
  if (!raw) return DEFAULT_PORT
  const port = Number(raw)
  if (!/^\d+$/.test(raw) || port < 1 || port > 65535) {
    throw new ConfigError(`PORT must be an integer between 1 and 65535 (received "${raw}").`)
  }
  return port
}

function parseOrigin(entry: string): string {
  if (entry === '*') {
    throw new ConfigError('CORS_ALLOWED_ORIGINS must list explicit origins; "*" is not allowed.')
  }
  let url: URL
  try {
    url = new URL(entry)
  } catch {
    throw new ConfigError(`CORS_ALLOWED_ORIGINS contains an invalid origin: "${entry}".`)
  }
  const isPlainOrigin =
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.pathname === '/' &&
    !url.search &&
    !url.hash &&
    !url.username &&
    !url.password
  if (!isPlainOrigin) {
    throw new ConfigError(
      `CORS_ALLOWED_ORIGINS entries must look like http(s)://host[:port] with no path (received "${entry}").`,
    )
  }
  return url.origin
}

function parseOrigins(value: string | undefined, isProduction: boolean): string[] {
  const entries = (value ?? '')
    .split(',')
    .map((entry) => entry.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  if (entries.length === 0) {
    if (isProduction) {
      throw new ConfigError('CORS_ALLOWED_ORIGINS must list at least one frontend origin in production.')
    }
    return [DEFAULT_DEV_ORIGIN]
  }
  return [...new Set(entries.map(parseOrigin))]
}

function parseModel(name: string, value: string | undefined, fallback: string): string {
  const model = value?.trim() || fallback
  // The model ID becomes part of a request URL, so allow only plain model-name characters.
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(model)) {
    throw new ConfigError(`${name} is not a valid model ID (received "${model}").`)
  }
  return model
}

function parseTrustProxyHops(value: string | undefined): number {
  const raw = value?.trim()
  if (!raw) return 0
  if (!/^\d$/.test(raw)) throw new ConfigError(`TRUST_PROXY_HOPS must be a number from 0 to 9 (received "${raw}").`)
  return Number(raw)
}

function parseGemini(env: NodeJS.ProcessEnv): GeminiSettings {
  const model = parseModel('GEMINI_MODEL', env.GEMINI_MODEL, DEFAULT_GEMINI_MODEL)
  const liveModel = parseModel('GEMINI_LIVE_MODEL', env.GEMINI_LIVE_MODEL, DEFAULT_GEMINI_LIVE_MODEL)
  // Only GEMINI_API_KEY, GEMINI_MODEL and GEMINI_LIVE_MODEL are used. GEMINI_API_NAME,
  // GEMINI_API_PROJECT_NAME and GEMINI_API_PROJECT_NUMBER are metadata and are ignored.
  const settings: { model: string; liveModel: string; apiKey?: string } = { model, liveModel }
  const apiKey = env.GEMINI_API_KEY?.trim()
  if (apiKey) Object.defineProperty(settings, 'apiKey', { value: apiKey, enumerable: false })
  return settings
}

/** Validate settings from an environment object. Pure, so it is easy to test. */
export function parseConfig(env: NodeJS.ProcessEnv): AppConfig {
  const nodeEnv = env.NODE_ENV?.trim() || 'development'
  const isProduction = nodeEnv === 'production'
  return {
    nodeEnv,
    isProduction,
    host: '0.0.0.0',
    port: parsePort(env.PORT),
    corsAllowedOrigins: parseOrigins(env.CORS_ALLOWED_ORIGINS, isProduction),
    trustProxyHops: parseTrustProxyHops(env.TRUST_PROXY_HOPS),
    gemini: parseGemini(env),
  }
}

/** Local settings file, next to package.json. Only this file is read, never a plain `.env`. */
const ENV_FILE_NAME = '.env.local'

/**
 * Read Backend/.env.local when present, then validate the environment. Variables
 * the platform already set (for example on Render) take precedence over the file.
 */
export function loadConfig(): AppConfig {
  // Resolved from this file, so it works from `src` (dev) and `dist` (production)
  // regardless of the directory the command is started from.
  dotenv.config({ path: fileURLToPath(new URL(`../${ENV_FILE_NAME}`, import.meta.url)), quiet: true })
  return parseConfig(process.env)
}
