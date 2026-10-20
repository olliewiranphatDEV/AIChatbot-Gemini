import { useCallback, useEffect, useReducer, useRef } from 'react'
import { requestLiveToken } from '../api/client.ts'
import type { HistoryTurn } from '../api/chatMessages.ts'
import { browserVoiceEnvironment, startMicCapture } from './capture.ts'
import { createVoiceController } from './controller.ts'
import type { VoiceController } from './controller.ts'
import { checkVoiceSupport } from './errors.ts'
import { createAudioPlayer } from './player.ts'
import { connectLive } from './session.ts'
import { describeVoice, initialVoiceState, isVoiceBusy, voiceReducer } from './state.ts'
import type { VoiceStatus, VoiceState } from './state.ts'
import type { TranscriptEvent } from './transcript.ts'

export type VoiceConversation = {
  state: VoiceState
  status: VoiceStatus
  busy: boolean
  start: (history: readonly HistoryTurn[]) => void
  mute: () => void
  unmute: () => void
  /** End the session. Safe to call when none is running. */
  end: () => void
  /** Dismiss the "ended"/"error" notice. */
  dismiss: () => void
  /** Loudness of the microphone and of the AI voice right now (0 to 1), for animation; read it each frame. */
  getLevels: () => { mic: number; ai: number }
}

/**
 * React wiring for one voice controller. The controller (and with it the microphone,
 * audio contexts and socket) lives exactly as long as the component that calls this.
 */
export function useVoiceConversation(onTranscript: (event: TranscriptEvent) => void): VoiceConversation {
  const [state, dispatch] = useReducer(voiceReducer, initialVoiceState)
  const transcriptRef = useRef(onTranscript)
  const controllerRef = useRef<VoiceController | null>(null)

  useEffect(() => {
    transcriptRef.current = onTranscript
  })

  useEffect(() => {
    const controller = createVoiceController(
      {
        checkSupport: () => checkVoiceSupport(browserVoiceEnvironment()),
        startCapture: startMicCapture,
        createPlayer: createAudioPlayer,
        requestToken: (signal) => requestLiveToken(signal),
        connect: connectLive,
      },
      { dispatch, transcript: (event) => transcriptRef.current(event) },
    )
    controllerRef.current = controller
    return () => {
      controller.dispose()
      controllerRef.current = null
    }
  }, [])

  const start = useCallback((history: readonly HistoryTurn[]) => controllerRef.current?.start(history), [])
  const mute = useCallback(() => controllerRef.current?.mute(), [])
  const unmute = useCallback(() => controllerRef.current?.unmute(), [])
  const end = useCallback(() => controllerRef.current?.end(), [])
  const dismiss = useCallback(() => dispatch({ type: 'reset' }), [])
  const getLevels = useCallback(() => controllerRef.current?.levels() ?? { mic: 0, ai: 0 }, [])

  return { state, status: describeVoice(state), busy: isVoiceBusy(state), start, mute, unmute, end, dismiss, getLevels }
}
