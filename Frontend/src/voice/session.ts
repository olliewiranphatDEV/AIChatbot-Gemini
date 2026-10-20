import type { Content } from '@google/genai'
import type { HistoryTurn } from '../api/chatMessages.ts'
import type { LiveCallbacks, LiveConnection } from './controller.ts'
import { INPUT_MIME_TYPE } from './audio.ts'

/** The server must acknowledge the session setup within this time. */
const SETUP_TIMEOUT_MS = 15_000

export function historyToContents(history: readonly HistoryTurn[]): Content[] {
  return history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] }))
}

/**
 * Open a Gemini Live session directly from the browser with a short-lived token from the
 * backend (never the API key). The model, response type, transcription and instructions
 * are locked into that token, so only conversation history is chosen here.
 *
 * The SDK is loaded on demand: it is only needed once someone presses the microphone.
 */
export async function connectLive(params: {
  token: string
  model: string
  history: readonly HistoryTurn[]
  callbacks: LiveCallbacks
}): Promise<LiveConnection> {
  const { token, model, history, callbacks } = params
  const { GoogleGenAI } = await import('@google/genai')
  const client = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } })

  let closedByUs = false
  // Until the setup is acknowledged, a failure is reported by rejecting connectLive, not by onClosed.
  let ready = false
  let markSetup: (() => void) | undefined
  let markFailed: ((reason: Error) => void) | undefined
  const setup = new Promise<void>((resolve, reject) => {
    markSetup = resolve
    markFailed = reject
  })
  setup.catch(() => undefined) // the rejection is handled where setup is awaited

  const session = await client.live.connect({
    model,
    callbacks: {
      onopen: () => {},
      onmessage: (message) => {
        if (message.setupComplete) markSetup?.()
        if (message.goAway) callbacks.onGoAway()
        const content = message.serverContent
        if (!content) return
        for (const part of content.modelTurn?.parts ?? []) {
          if (part.inlineData?.data) callbacks.onAudio(part.inlineData.data)
        }
        if (content.interrupted) callbacks.onInterrupted()
        if (content.inputTranscription?.text) callbacks.onInputText(content.inputTranscription.text)
        if (content.outputTranscription?.text) callbacks.onOutputText(content.outputTranscription.text)
        if (content.turnComplete) callbacks.onTurnComplete()
      },
      onerror: () => {
        // The close event that follows carries the outcome; details are not shown or logged
        // because they can include request metadata.
        markFailed?.(new Error('Live connection error'))
      },
      onclose: (event) => {
        markFailed?.(new Error('Live connection closed'))
        if (closedByUs || !ready) return
        console.warn('Voice session closed by the server', { code: event.code })
        callbacks.onClosed()
      },
    },
  })

  const connection: LiveConnection = {
    sendAudio: (base64Pcm) => session.sendRealtimeInput({ audio: { data: base64Pcm, mimeType: INPUT_MIME_TYPE } }),
    sendAudioEnd: () => session.sendRealtimeInput({ audioStreamEnd: true }),
    close: () => {
      closedByUs = true
      session.close()
    },
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      setup,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Live setup timed out')), SETUP_TIMEOUT_MS)
      }),
    ])
    ready = true
    // Earlier completed exchanges go in as text turns (history); the user's next words are live audio.
    // `turnComplete: false` adds them as context without asking the model to answer them.
    if (history.length > 0) session.sendClientContent({ turns: historyToContents(history), turnComplete: false })
  } catch (error) {
    connection.close()
    throw error
  } finally {
    clearTimeout(timer)
  }
  return connection
}
