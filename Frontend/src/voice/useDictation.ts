import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribeRecording } from '../api/client.ts'
import { browserVoiceEnvironment, startMicCapture } from './capture.ts'
import { createDictationController, idleDictation } from './dictation.ts'
import type { DictationController, DictationState } from './dictation.ts'
import { checkVoiceSupport } from './errors.ts'

export type Dictation = {
  state: DictationState
  /** Recording or transcribing: the microphone or a request is in use. */
  busy: boolean
  start: () => void
  stop: () => void
  cancel: () => void
  retry: () => void
}

/**
 * React wiring for one dictation controller. `onText` receives the transcript when it is
 * ready; the microphone and any request are released when the component goes away.
 */
export function useDictation(onText: (text: string) => void): Dictation {
  const [state, setState] = useState<DictationState>(idleDictation)
  const textRef = useRef(onText)
  const controllerRef = useRef<DictationController | null>(null)

  useEffect(() => {
    textRef.current = onText
  })

  useEffect(() => {
    const controller = createDictationController(
      {
        checkSupport: () => checkVoiceSupport(browserVoiceEnvironment()),
        startCapture: startMicCapture,
        transcribe: (wav, signal) => transcribeRecording(wav as Uint8Array<ArrayBuffer>, signal),
      },
      { state: setState, text: (text) => textRef.current(text) },
    )
    controllerRef.current = controller
    return () => {
      controller.dispose()
      controllerRef.current = null
    }
  }, [])

  const start = useCallback(() => controllerRef.current?.start(), [])
  const stop = useCallback(() => controllerRef.current?.stop(), [])
  const cancel = useCallback(() => controllerRef.current?.cancel(), [])
  const retry = useCallback(() => controllerRef.current?.retry(), [])

  return { state, busy: state.phase === 'recording' || state.phase === 'transcribing', start, stop, cancel, retry }
}
