import type { MicCapture } from './controller.ts'
import type { VoiceEnvironment } from './errors.ts'
import { createDownsampler, floatToPcm16, INPUT_SAMPLE_RATE } from './audio.ts'

// Runs on the audio thread: collects 2048 samples (about 43 ms at 48 kHz) per message.
const WORKLET_SOURCE = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = new Float32Array(2048)
    this.length = 0
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (channel) {
      for (let i = 0; i < channel.length; i += 1) {
        this.buffer[this.length++] = channel[i]
        if (this.length === this.buffer.length) {
          this.port.postMessage(this.buffer.slice(0))
          this.length = 0
        }
      }
    }
    return true
  }
}
registerProcessor('pcm-capture', PcmCapture)
`

export function browserVoiceEnvironment(): VoiceEnvironment {
  return {
    isSecureContext: window.isSecureContext,
    hasGetUserMedia: typeof navigator.mediaDevices?.getUserMedia === 'function',
    hasAudioWorklet: typeof AudioContext !== 'undefined' && typeof AudioWorkletNode !== 'undefined',
    hasWebSocket: typeof WebSocket !== 'undefined',
  }
}

/**
 * Open the microphone (this is what shows the browser's permission prompt) and stream it
 * as 16 kHz mono PCM16 chunks. Throws the browser's own error (NotAllowedError, ...) when
 * the microphone is refused or missing; the controller turns that into a message.
 */
export async function startMicCapture(onChunk: (pcm: Int16Array) => void): Promise<MicCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })
  let context: AudioContext | undefined
  let moduleUrl: string | undefined
  let node: AudioWorkletNode | undefined
  let source: MediaStreamAudioSourceNode | undefined
  let silence: GainNode | undefined
  let muted = false
  // Loudness of the latest audio, for the orb: it rises with speech and fades on its own.
  let level = 0
  let levelAt = 0
  const stopTracks = () => stream.getTracks().forEach((track) => track.stop())

  try {
    context = new AudioContext({ latencyHint: 'interactive' })
    moduleUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'text/javascript' }))
    await context.audioWorklet.addModule(moduleUrl)
    URL.revokeObjectURL(moduleUrl)
    moduleUrl = undefined

    const downsample = createDownsampler(context.sampleRate, INPUT_SAMPLE_RATE)
    node = new AudioWorkletNode(context, 'pcm-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 })
    node.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (muted) return
      let sum = 0
      for (const sample of event.data) sum += sample * sample
      level = Math.min(1, Math.sqrt(sum / event.data.length) * 8)
      levelAt = performance.now()
      const pcm = floatToPcm16(downsample(event.data))
      if (pcm.length > 0) onChunk(pcm)
    }
    source = context.createMediaStreamSource(stream)
    // The worklet has to be connected to the output to be processed; a zero-gain node keeps it silent.
    silence = context.createGain()
    silence.gain.value = 0
    source.connect(node)
    node.connect(silence)
    silence.connect(context.destination)
    if (context.state === 'suspended') await context.resume()
  } catch (error) {
    if (moduleUrl) URL.revokeObjectURL(moduleUrl)
    stopTracks()
    await context?.close().catch(() => undefined)
    throw error
  }

  const ownedContext = context
  return {
    getLevel: () => (muted ? 0 : Math.max(0, level - (performance.now() - levelAt) / 350)),
    setMuted(value) {
      muted = value
      level = 0
      // A disabled track sends silence and lets the browser show that the mic is not in use.
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !value
      })
    },
    stop() {
      if (node) node.port.onmessage = null
      source?.disconnect()
      node?.disconnect()
      silence?.disconnect()
      stopTracks()
      void ownedContext.close().catch(() => undefined)
    },
  }
}
