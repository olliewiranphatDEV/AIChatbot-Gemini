import type { AudioPlayer } from './controller.ts'
import { OUTPUT_SAMPLE_RATE, pcm16ToFloat } from './audio.ts'

/**
 * Plays Gemini's 24 kHz mono PCM16 reply. Chunks arrive faster than real time, so each is
 * scheduled to start exactly when the previous one ends; `stop()` cancels everything
 * queued, which is how barge-in silences the AI immediately.
 */
export function createAudioPlayer(onPlayingChange: (playing: boolean) => void): AudioPlayer {
  const context = new AudioContext({ latencyHint: 'interactive' })
  const active = new Set<AudioBufferSourceNode>()
  // Measures what is being played, so the orb can follow the AI's voice.
  const analyser = context.createAnalyser()
  analyser.fftSize = 512
  analyser.connect(context.destination)
  const samples = new Float32Array(analyser.fftSize)
  let nextStart = 0
  let playing = false
  let closed = false

  const setPlaying = (value: boolean) => {
    if (playing === value || closed) return
    playing = value
    onPlayingChange(value)
  }

  const stop = () => {
    for (const source of active) {
      source.onended = null
      try {
        source.stop()
      } catch {
        // Already finished.
      }
      source.disconnect()
    }
    active.clear()
    nextStart = 0
    setPlaying(false)
  }

  return {
    enqueue(pcm) {
      if (closed || pcm.length === 0) return
      if (context.state === 'suspended') void context.resume()
      const buffer = context.createBuffer(1, pcm.length, OUTPUT_SAMPLE_RATE)
      buffer.copyToChannel(pcm16ToFloat(pcm) as Float32Array<ArrayBuffer>, 0)
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(analyser)
      // A little lead time so the first chunk does not start late and clip.
      nextStart = Math.max(nextStart, context.currentTime + 0.04)
      source.start(nextStart)
      nextStart += buffer.duration
      active.add(source)
      source.onended = () => {
        active.delete(source)
        source.disconnect()
        if (active.size === 0) setPlaying(false)
      }
      setPlaying(true)
    },
    stop,
    getLevel() {
      if (closed || !playing) return 0
      analyser.getFloatTimeDomainData(samples)
      let sum = 0
      for (const sample of samples) sum += sample * sample
      return Math.min(1, Math.sqrt(sum / samples.length) * 6)
    },
    close() {
      if (closed) return
      stop()
      closed = true
      void context.close().catch(() => undefined)
    },
  }
}
