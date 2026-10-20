import assert from 'node:assert/strict'
import { test } from 'node:test'
import { appendToDraft, encodeWav, MAX_RECORDING_SECONDS, RECORDING_SAMPLE_RATE, samplesToSeconds } from '../../src/voice/wav.ts'

test('the WAV header describes mono 16-bit PCM at 16 kHz and the sizes add up', () => {
  const wav = encodeWav([Int16Array.from([1, -2, 3]), Int16Array.from([32767, -32768])])
  const view = new DataView(wav.buffer)
  const text = (at: number, n: number) => String.fromCharCode(...wav.subarray(at, at + n))
  assert.equal(wav.length, 44 + 5 * 2)
  assert.equal(text(0, 4), 'RIFF')
  assert.equal(view.getUint32(4, true), wav.length - 8)
  assert.equal(text(8, 8), 'WAVEfmt ')
  assert.equal(view.getUint16(20, true), 1, 'PCM')
  assert.equal(view.getUint16(22, true), 1, 'mono')
  assert.equal(view.getUint32(24, true), 16_000)
  assert.equal(view.getUint32(28, true), 32_000, 'byte rate')
  assert.equal(view.getUint16(34, true), 16, 'bits')
  assert.equal(text(36, 4), 'data')
  assert.equal(view.getUint32(40, true), 10)
})

test('samples are written little-endian, in order, across chunk boundaries', () => {
  const wav = encodeWav([Int16Array.from([1, -2, 3]), Int16Array.from([32767, -32768])])
  const view = new DataView(wav.buffer)
  const samples = [0, 1, 2, 3, 4].map((i) => view.getInt16(44 + i * 2, true))
  assert.deepEqual(samples, [1, -2, 3, 32767, -32768])
  assert.equal(wav[44], 1)
  assert.equal(wav[45], 0)
})

test('a recording of the maximum length fits the backend size limit (2,000,000 bytes)', () => {
  const wav = encodeWav([new Int16Array(RECORDING_SAMPLE_RATE * MAX_RECORDING_SECONDS)])
  assert.ok(wav.length <= 2_000_000, `${wav.length} bytes`)
  assert.equal(samplesToSeconds(RECORDING_SAMPLE_RATE * 3), 3)
})

test('dictated text is appended to what the user already typed, never replacing it', () => {
  assert.equal(appendToDraft('', ' hello '), 'hello')
  assert.equal(appendToDraft('   ', 'hello'), 'hello')
  assert.equal(appendToDraft('Please check', 'the logs'), 'Please check the logs')
  assert.equal(appendToDraft('Line one\n', 'next'), 'Line one next')
  assert.equal(appendToDraft('keep this', '   '), 'keep this')
})
