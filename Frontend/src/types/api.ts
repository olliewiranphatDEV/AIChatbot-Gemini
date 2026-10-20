/** Response of `GET /api/health` on the backend. */
export type HealthResponse = {
  status: 'ok'
  service: string
}

/** One message of the conversation sent to `POST /api/chat`. */
export type ChatApiMessage = {
  role: 'user' | 'assistant'
  content: string
}

/** Response of `POST /api/live-token`: a short-lived, single-use credential for one voice session. */
export type LiveTokenResponse = {
  token: string
  /** The Gemini Live model the token is locked to. */
  model: string
  expiresAt: string
  newSessionExpiresAt: string
}

/** Response of `POST /api/transcribe`. */
export type TranscribeResponse = {
  text: string
}

/** Response of `POST /api/chat`. */
export type ChatReplyResponse = {
  reply: string
}
