// Pure audio helpers for the voice conversation. No browser APIs, so they run under node:test.
//
// Wire formats (Gemini Live API):
//   microphone -> Gemini : raw little-endian 16-bit PCM, mono, 16 000 Hz  ("audio/pcm;rate=16000")
//   Gemini -> speaker    : raw little-endian 16-bit PCM, mono, 24 000 Hz
// Browsers capture at the device rate (usually 44 100 or 48 000 Hz), so the microphone
// stream is resampled here. MediaRecorder is not used: it produces compressed WebM/Opus.

export const INPUT_SAMPLE_RATE = 16_000
export const OUTPUT_SAMPLE_RATE = 24_000
export const INPUT_MIME_TYPE = `audio/pcm;rate=${INPUT_SAMPLE_RATE}`

/**
 * Streaming downsampler. Every output sample is the average of the input samples that
 * fall inside its time slot (a box filter), which also removes content above the new
 * Nyquist rate. State is kept between calls, so chunk boundaries are seamless.
 */
export function createDownsampler(inputRate: number, outputRate: number): (input: Float32Array) => Float32Array {
  if (!(inputRate > 0) || !(outputRate > 0)) throw new RangeError('Sample rates must be positive.')
  if (outputRate > inputRate) throw new RangeError('Upsampling is not supported.')
  const ratio = inputRate / outputRate
  let sum = 0
  let count = 0
  // Position, in input samples, at which the current output sample ends.
  let nextBoundary = ratio
  let position = 0

  return (input) => {
    const out: number[] = []
    for (let i = 0; i < input.length; i += 1) {
      sum += input[i]
      count += 1
      position += 1
      if (position >= nextBoundary) {
        out.push(sum / count)
        sum = 0
        count = 0
        nextBoundary += ratio
      }
    }
    return Float32Array.from(out)
  }
}

/** Float samples in [-1, 1] -> 16-bit PCM. Values outside the range are clamped. */
export function floatToPcm16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i += 1) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff)
  }
  return out
}

/** 16-bit PCM -> float samples in [-1, 1). */
export function pcm16ToFloat(input: Int16Array): Float32Array {
  const out = new Float32Array(input.length)
  for (let i = 0; i < input.length; i += 1) out[i] = input[i] / 0x8000
  return out
}

/** Bytes of little-endian PCM16 -> base64, as the Live API expects for realtime audio. */
export function pcm16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.length * 2)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < pcm.length; i += 1) view.setInt16(i * 2, pcm[i], true)
  let binary = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) binary += String.fromCharCode(...bytes.subarray(i, i + step))
  return btoa(binary)
}

/** Base64 little-endian PCM16 -> samples. A trailing odd byte is dropped. */
export function base64ToPcm16(base64: string): Int16Array {
  const binary = atob(base64)
  const length = binary.length >> 1
  const view = new DataView(new ArrayBuffer(length * 2))
  for (let i = 0; i < length * 2; i += 1) view.setUint8(i, binary.charCodeAt(i))
  const out = new Int16Array(length)
  for (let i = 0; i < length; i += 1) out[i] = view.getInt16(i * 2, true)
  return out
}
