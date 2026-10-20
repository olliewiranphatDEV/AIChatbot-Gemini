// Packs microphone PCM into the WAV file `POST /api/transcribe` accepts.
// Keep the format in sync with TRANSCRIBE_LIMITS in Backend/src/transcribe.ts.

export const RECORDING_SAMPLE_RATE = 16_000
/** Recording stops by itself here, so one request stays well under the backend's size limit. */
export const MAX_RECORDING_SECONDS = 60
/** Anything shorter is a mis-click, not speech. */
export const MIN_RECORDING_SECONDS = 0.3

/** Mono 16-bit little-endian PCM at 16 kHz with the canonical 44-byte WAV header. */
export function encodeWav(chunks: readonly Int16Array[]): Uint8Array {
  const samples = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const bytes = new Uint8Array(44 + samples * 2)
  const view = new DataView(bytes.buffer)
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i))
  }
  writeText(0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, RECORDING_SAMPLE_RATE, true)
  view.setUint32(28, RECORDING_SAMPLE_RATE * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeText(36, 'data')
  view.setUint32(40, samples * 2, true)
  let offset = 44
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i += 1, offset += 2) view.setInt16(offset, chunk[i], true)
  }
  return bytes
}

export const samplesToSeconds = (samples: number) => samples / RECORDING_SAMPLE_RATE

/** Add dictated text to what the user already typed: one space between, nothing doubled. */
export function appendToDraft(draft: string, text: string): string {
  const addition = text.trim()
  if (addition === '') return draft
  return draft.trim() === '' ? addition : `${draft.trimEnd()} ${addition}`
}
