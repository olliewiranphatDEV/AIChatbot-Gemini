import assert from 'node:assert/strict'
import { test } from 'node:test'
import { base64ToPcm16, createDownsampler, floatToPcm16, pcm16ToBase64, pcm16ToFloat } from '../../src/voice/audio.ts'

const sine = (frequency: number, rate: number, seconds: number) =>
  Float32Array.from({ length: Math.round(rate * seconds) }, (_, i) => Math.sin((2 * Math.PI * frequency * i) / rate))

test('48 kHz -> 16 kHz keeps a constant signal constant and gives one third of the samples', () => {
  const out = createDownsampler(48_000, 16_000)(new Float32Array(4800).fill(0.5))
  assert.equal(out.length, 1600)
  assert.ok(out.every((v) => Math.abs(v - 0.5) < 1e-6))
})

test('44.1 kHz -> 16 kHz produces the right amount of audio over time (no drift)', () => {
  const down = createDownsampler(44_100, 16_000)
  let total = 0
  for (let i = 0; i < 100; i += 1) total += down(new Float32Array(441)).length // 100 x 10 ms
  assert.ok(Math.abs(total - 16_000) <= 1, `expected about 16000 samples, got ${total}`)
})

test('chunk boundaries do not matter: odd-sized chunks give the same output as one big chunk', () => {
  const input = sine(440, 48_000, 0.5)
  const whole = createDownsampler(48_000, 16_000)(input)
  const down = createDownsampler(48_000, 16_000)
  const parts: number[] = []
  for (let at = 0, size = 7; at < input.length; at += size, size = (size % 13) + 5) parts.push(...down(input.subarray(at, at + size)))
  assert.equal(parts.length, whole.length)
  parts.forEach((v, i) => assert.ok(Math.abs(v - whole[i]) < 1e-5))
})

test('a speech-range tone keeps its level; a tone at the new sample rate is strongly attenuated', () => {
  const peak = (a: Float32Array) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
  const low = createDownsampler(48_000, 16_000)(sine(500, 48_000, 0.2))
  const high = createDownsampler(48_000, 16_000)(sine(16_000, 48_000, 0.2))
  assert.ok(peak(low) > 0.95, `500 Hz peak ${peak(low)}`)
  assert.ok(peak(high) < 0.5, `16 kHz peak ${peak(high)}`)
})

test('the downsampler rejects impossible rates', () => {
  assert.throws(() => createDownsampler(16_000, 48_000), RangeError)
  assert.throws(() => createDownsampler(0, 16_000), RangeError)
})

test('float -> PCM16 covers the full range and clamps', () => {
  const pcm = floatToPcm16(Float32Array.from([0, 1, -1, 2, -2, 0.5]))
  assert.deepEqual(Array.from(pcm), [0, 32767, -32768, 32767, -32768, 16384])
})

test('PCM16 -> float stays inside [-1, 1)', () => {
  const f = pcm16ToFloat(Int16Array.from([-32768, 0, 32767]))
  assert.equal(f[0], -1)
  assert.equal(f[1], 0)
  assert.ok(f[2] < 1)
})

test('base64 round trip is little-endian PCM16, including values with the high bit set', () => {
  const pcm = Int16Array.from([0, 1, -1, 12345, -12345, 32767, -32768])
  assert.deepEqual(Array.from(base64ToPcm16(pcm16ToBase64(pcm))), Array.from(pcm))
  // 0x0001 little-endian is the bytes 01 00
  assert.equal(pcm16ToBase64(Int16Array.from([1])), btoa(String.fromCharCode(1, 0)))
})

test('large chunks encode without call-stack problems and a trailing odd byte is dropped', () => {
  const big = new Int16Array(200_000).fill(1000)
  assert.equal(base64ToPcm16(pcm16ToBase64(big)).length, big.length)
  assert.equal(base64ToPcm16(btoa(String.fromCharCode(1, 0, 9))).length, 1)
})
