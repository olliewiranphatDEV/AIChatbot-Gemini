// The lifecycle of one voice session, independent of React and of the real microphone,
// speaker and network (they are injected). Everything that can leak - the microphone,
// the audio contexts, the socket, in-flight requests - is released in one place
// (`teardown`), which every way of ending a session goes through.

import type { HistoryTurn } from '../api/chatMessages.ts'
import { base64ToPcm16, pcm16ToBase64 } from './audio.ts'
import { describeVoiceError, SESSION_ENDED_MESSAGE, SESSION_LIMIT_MESSAGE } from './errors.ts'
import type { VoiceAction, VoiceError } from './state.ts'
import type { TranscriptEvent } from './transcript.ts'

/** What the Live connection reports. */
export type LiveCallbacks = {
  onAudio: (base64Pcm: string) => void
  onInputText: (text: string) => void
  onOutputText: (text: string) => void
  onInterrupted: () => void
  onTurnComplete: () => void
  /** The server announced that it will close the session soon. */
  onGoAway: () => void
  /** The connection closed or failed. Never called after `close()` of our own. */
  onClosed: () => void
}

export type LiveConnection = {
  sendAudio: (base64Pcm: string) => void
  /** Tells Gemini the microphone stream paused, so it can answer what it already heard. */
  sendAudioEnd: () => void
  close: () => void
}

export type MicCapture = {
  setMuted: (muted: boolean) => void
  stop: () => void
  /** Current microphone loudness, 0 to 1 (drives the orb). */
  getLevel?: () => number
}

export type AudioPlayer = {
  enqueue: (pcm: Int16Array) => void
  /** Drop everything queued or playing (barge-in). */
  stop: () => void
  close: () => void
  /** Current loudness of what is playing, 0 to 1 (drives the orb). */
  getLevel?: () => number
}

export type VoiceDeps = {
  checkSupport: () => VoiceError | null
  startCapture: (onChunk: (pcm: Int16Array) => void) => Promise<MicCapture>
  createPlayer: (onPlayingChange: (playing: boolean) => void) => AudioPlayer
  requestToken: (signal: AbortSignal) => Promise<{ token: string; model: string }>
  connect: (params: { token: string; model: string; history: readonly HistoryTurn[]; callbacks: LiveCallbacks }) => Promise<LiveConnection>
  now?: () => number
  /** How long after the user stops speaking, with no answer yet, the status becomes "thinking". */
  thinkingDelayMs?: number
}

export type VoiceSink = {
  dispatch: (action: VoiceAction) => void
  transcript: (event: TranscriptEvent) => void
}

export type VoiceController = {
  start: (history: readonly HistoryTurn[]) => void
  mute: () => void
  unmute: () => void
  /** End the session the user is in (or setting up). */
  end: () => void
  /** Release everything without reporting to the UI. For when the owner is going away. */
  dispose: () => void
  isBusy: () => boolean
  /** Live loudness of the microphone and of the AI's voice, for animation. Zeroes when no session. */
  levels: () => { mic: number; ai: number }
}

type Session = {
  closed: boolean
  abort: AbortController
  capture?: MicCapture
  player?: AudioPlayer
  connection?: LiveConnection
  muted: boolean
  goAway: boolean
  /** The user has spoken and the AI has not started answering. */
  awaitingAi: boolean
  thinkingTimer?: ReturnType<typeof setTimeout>
}

export function createVoiceController(deps: VoiceDeps, sink: VoiceSink): VoiceController {
  const now = deps.now ?? Date.now
  const thinkingDelayMs = deps.thinkingDelayMs ?? 900
  let session: Session | null = null
  // After a rate limit, do not ask for another token before the provider's retry time.
  let retryNotBefore = 0

  // Idempotent: stops whatever has been acquired so far. Also called for resources that
  // arrive after the session was already ended (setup is asynchronous).
  function release(target: Session) {
    // Each release is independent: one failing must not leave the microphone on.
    const attempt = (fn: (() => void) | undefined) => {
      try {
        fn?.()
      } catch {
        // Nothing useful to do; the resource is being discarded anyway.
      }
    }
    const { capture, player, connection } = target
    target.capture = undefined
    target.player = undefined
    target.connection = undefined
    // Called as methods (not detached), so implementations may use `this`.
    attempt(() => capture?.stop())
    attempt(() => player?.close())
    attempt(() => connection?.close())
  }

  function clearThinking(target: Session) {
    clearTimeout(target.thinkingTimer)
    target.thinkingTimer = undefined
  }

  function teardown(target: Session) {
    target.closed = true
    clearThinking(target)
    target.abort.abort()
    release(target)
    if (session === target) session = null
  }

  function fail(target: Session, error: VoiceError) {
    if (target.closed) return
    teardown(target)
    sink.transcript({ type: 'close' })
    sink.dispatch({ type: 'fail', error, at: now() })
  }

  async function run(target: Session, history: readonly HistoryTurn[]) {
    const live = () => !target.closed
    try {
      // The microphone first: if it is refused, no single-use token is wasted.
      target.capture = await deps.startCapture((pcm) => {
        if (!live() || target.muted || !target.connection) return
        target.connection.sendAudio(pcm16ToBase64(pcm))
      })
      if (!live()) return release(target)
      target.player = deps.createPlayer((playing) => {
        if (live()) sink.dispatch({ type: playing ? 'ai-speaking' : 'ai-silent' })
      })

      const { token, model } = await deps.requestToken(target.abort.signal)
      if (!live()) return release(target)

      const connection = await deps.connect({
        token,
        model,
        history,
        callbacks: {
          onAudio: (data) => {
            if (!live()) return
            target.awaitingAi = false
            clearThinking(target)
            target.player?.enqueue(base64ToPcm16(data))
          },
          onInputText: (text) => {
            if (!live()) return
            sink.transcript({ type: 'input', text })
            // The user is (still) talking. Once their words stop and no answer starts, the AI is thinking.
            target.awaitingAi = true
            clearThinking(target)
            sink.dispatch({ type: 'not-thinking' })
            target.thinkingTimer = setTimeout(() => {
              if (live() && target.awaitingAi) sink.dispatch({ type: 'thinking' })
            }, thinkingDelayMs)
          },
          onOutputText: (text) => {
            if (!live()) return
            target.awaitingAi = false
            clearThinking(target)
            sink.transcript({ type: 'output', text })
          },
          onInterrupted: () => {
            if (!live()) return
            // Barge-in: stop what is queued at once instead of letting it play out.
            target.player?.stop()
            target.awaitingAi = false
            clearThinking(target)
            sink.transcript({ type: 'interrupted' })
            sink.dispatch({ type: 'ai-silent' })
            sink.dispatch({ type: 'not-thinking' })
          },
          onTurnComplete: () => {
            if (!live()) return
            target.awaitingAi = false
            clearThinking(target)
            sink.dispatch({ type: 'not-thinking' })
            sink.transcript({ type: 'turn-complete' })
          },
          onGoAway: () => {
            target.goAway = true
          },
          // No automatic reconnect: the user decides, so a failing connection cannot loop.
          onClosed: () => fail(target, target.goAway ? SESSION_LIMIT_MESSAGE : SESSION_ENDED_MESSAGE),
        },
      })
      if (!live()) {
        // Ended while the connection was being opened.
        connection.close()
        return release(target)
      }
      target.connection = connection
      sink.dispatch({ type: 'connected', at: now() })
    } catch (error) {
      if (!live()) return release(target)
      const described = describeVoiceError(error)
      if (described.retryAfterSeconds) retryNotBefore = now() + described.retryAfterSeconds * 1000
      fail(target, described)
    }
  }

  return {
    start(history) {
      if (session) return // one voice session at a time
      const unsupported = deps.checkSupport()
      if (unsupported) return sink.dispatch({ type: 'fail', error: unsupported })
      const waitMs = retryNotBefore - now()
      if (waitMs > 0) {
        const seconds = Math.ceil(waitMs / 1000)
        return sink.dispatch({
          type: 'fail',
          error: { kind: 'token', message: `The AI service asked us to wait. Please try again in about ${seconds} second${seconds === 1 ? '' : 's'}.`, retryAfterSeconds: seconds },
        })
      }
      const target: Session = { closed: false, abort: new AbortController(), muted: false, goAway: false, awaitingAi: false }
      session = target
      sink.dispatch({ type: 'start' })
      void run(target, history)
    },
    mute() {
      if (!session?.connection || session.muted) return
      session.muted = true
      session.capture?.setMuted(true)
      session.connection.sendAudioEnd()
      sink.dispatch({ type: 'mute' })
    },
    unmute() {
      if (!session?.connection || !session.muted) return
      session.muted = false
      session.capture?.setMuted(false)
      sink.dispatch({ type: 'unmute' })
    },
    end() {
      const target = session
      if (!target) return
      teardown(target)
      sink.transcript({ type: 'close' })
      sink.dispatch({ type: 'end', at: now() })
    },
    dispose() {
      if (session) teardown(session)
    },
    isBusy: () => session !== null,
    levels: () => ({ mic: session?.capture?.getLevel?.() ?? 0, ai: session?.player?.getLevel?.() ?? 0 }),
  }
}
