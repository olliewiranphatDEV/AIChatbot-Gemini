// "Speak -> review -> send": records the microphone locally, and only when the user presses
// End sends the recording to be transcribed. The text goes into the message box for the
// user to check and edit; nothing is sent to the AI until they press Send.
//
// Like the Live controller this is independent of React and of the real microphone and
// network (injected), and every way of finishing releases the microphone.

import { ApiError } from '../api/apiError.ts'
import { describeVoiceError } from './errors.ts'
import type { MicCapture } from './controller.ts'
import type { VoiceError } from './state.ts'
import { encodeWav, MAX_RECORDING_SECONDS, MIN_RECORDING_SECONDS, RECORDING_SAMPLE_RATE, samplesToSeconds } from './wav.ts'

export type DictationState =
  | { phase: 'idle' }
  | { phase: 'recording'; seconds: number }
  | { phase: 'transcribing' }
  | { phase: 'error'; message: string; /** The recording is kept and can be sent again. */ canRetry: boolean }

export const idleDictation: DictationState = { phase: 'idle' }

export type DictationDeps = {
  checkSupport: () => VoiceError | null
  startCapture: (onChunk: (pcm: Int16Array) => void) => Promise<MicCapture>
  transcribe: (wav: Uint8Array, signal: AbortSignal) => Promise<string>
  now?: () => number
}

export type DictationSink = {
  state: (state: DictationState) => void
  /** The transcript, once it is ready. */
  text: (text: string) => void
}

export type DictationController = {
  start: () => void
  /** Stop recording and transcribe what was said. */
  stop: () => void
  /** Throw the recording away. */
  cancel: () => void
  /** Send a kept recording to be transcribed again. */
  retry: () => void
  /** Release everything without reporting to the UI. */
  dispose: () => void
  isBusy: () => boolean
}

type Recording = { closed: boolean; capture?: MicCapture; chunks: Int16Array[]; samples: number; shownSeconds: number }

// Errors for which sending the same recording again cannot help.
const FINAL_SERVER_CODES = new Set(['no_speech', 'invalid_audio', 'ai_response_blocked'])

export function createDictationController(deps: DictationDeps, sink: DictationSink): DictationController {
  const now = deps.now ?? Date.now
  let phase: DictationState['phase'] = 'idle'
  let recording: Recording | null = null
  let abort: AbortController | null = null
  // The recording of a failed transcription, kept so the user can try again.
  let kept: Uint8Array | null = null
  let retryNotBefore = 0

  const emit = (state: DictationState) => {
    phase = state.phase
    sink.state(state)
  }

  function releaseMic(target: Recording) {
    target.closed = true
    const capture = target.capture
    target.capture = undefined
    try {
      capture?.stop()
    } catch {
      // The microphone is being discarded anyway.
    }
  }

  function fail(message: string, canRetry: boolean) {
    if (!canRetry) kept = null
    emit({ phase: 'error', message, canRetry })
  }

  async function transcribe(wav: Uint8Array) {
    const controller = new AbortController()
    abort = controller
    kept = wav
    emit({ phase: 'transcribing' })
    try {
      const text = (await deps.transcribe(wav, controller.signal)).trim()
      if (controller.signal.aborted) return
      kept = null
      emit(idleDictation)
      if (text) sink.text(text)
      else fail('No speech was detected. Try again and speak closer to the microphone.', false)
    } catch (error) {
      if (controller.signal.aborted) return
      const described = describeVoiceError(error)
      if (described.retryAfterSeconds) retryNotBefore = now() + described.retryAfterSeconds * 1000
      const final = error instanceof ApiError && error.serverCode !== undefined && FINAL_SERVER_CODES.has(error.serverCode)
      fail(described.message, !final)
    } finally {
      if (abort === controller) abort = null
    }
  }

  function finish(target: Recording) {
    const seconds = samplesToSeconds(target.samples)
    const chunks = target.chunks
    releaseMic(target)
    recording = null
    if (seconds < MIN_RECORDING_SECONDS) {
      fail('The recording was too short. Press Voice and speak a little longer.', false)
      return
    }
    void transcribe(encodeWav(chunks))
  }

  return {
    start() {
      if (phase === 'recording' || phase === 'transcribing') return
      const unsupported = deps.checkSupport()
      if (unsupported) return fail(unsupported.message, false)
      kept = null
      const target: Recording = { closed: false, chunks: [], samples: 0, shownSeconds: 0 }
      recording = target
      emit({ phase: 'recording', seconds: 0 })
      deps
        .startCapture((pcm) => {
          if (target.closed) return
          target.chunks.push(pcm)
          target.samples += pcm.length
          const seconds = Math.floor(samplesToSeconds(target.samples))
          if (seconds !== target.shownSeconds) {
            target.shownSeconds = seconds
            emit({ phase: 'recording', seconds })
          }
          // Stop by itself at the limit, so a forgotten recording cannot grow without bound.
          if (target.samples >= MAX_RECORDING_SECONDS * RECORDING_SAMPLE_RATE) finish(target)
        })
        .then(
          (capture) => {
            // Cancelled or finished while the permission prompt was open: do not keep the microphone.
            if (target.closed) {
              try {
                capture.stop()
              } catch {
                // Nothing to do.
              }
              return
            }
            target.capture = capture
          },
          (error: unknown) => {
            if (target.closed) return
            target.closed = true
            recording = null
            fail(describeVoiceError(error).message, false)
          },
        )
    },
    stop() {
      const target = recording
      if (!target || phase !== 'recording') return
      // Pressed before the microphone was even ready: there is nothing to transcribe.
      if (!target.capture) {
        target.closed = true
        recording = null
        emit(idleDictation)
        return
      }
      finish(target)
    },
    cancel() {
      if (recording) releaseMic(recording)
      recording = null
      abort?.abort()
      abort = null
      kept = null
      if (phase !== 'idle') emit(idleDictation)
    },
    retry() {
      if (phase !== 'error' || !kept) return
      const waitMs = retryNotBefore - now()
      if (waitMs > 0) {
        const seconds = Math.ceil(waitMs / 1000)
        emit({ phase: 'error', canRetry: true, message: `The AI service asked us to wait. Please try again in about ${seconds} second${seconds === 1 ? '' : 's'}.` })
        return
      }
      void transcribe(kept)
    },
    dispose() {
      if (recording) releaseMic(recording)
      recording = null
      abort?.abort()
      abort = null
      kept = null
    },
    isBusy: () => phase === 'recording' || phase === 'transcribing',
  }
}
