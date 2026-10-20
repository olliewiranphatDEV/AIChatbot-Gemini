import { useEffect, useRef } from 'react'
import type { LiveStatusKey } from '../../voice/liveStatus.ts'

type LiveOrbProps = {
  status: LiveStatusKey
  /** Real loudness of the microphone and of the AI voice (0 to 1). Read once per animation frame. */
  getLevels: () => { mic: number; ai: number }
}

// Resting heights (rem) of the five wave bars and how strongly each follows the sound.
const BARS = [
  { base: 0.9, gain: 1.1 },
  { base: 1.5, gain: 1.7 },
  { base: 2.2, gain: 2.4 },
  { base: 1.5, gain: 1.7 },
  { base: 0.9, gain: 1.1 },
] as const

const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The voice orb and the wave bars under it. Both follow one `--lvl` value (0 to 1) taken from
 * the real audio each frame: the AI's voice while it speaks, otherwise the microphone, and a
 * gentle pulse while it thinks. The value is written straight to the element, so animating
 * never re-renders React. With "reduce motion" nothing animates.
 */
export default function LiveOrb({ status, getLevels }: LiveOrbProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (reducedMotion()) {
      root.style.setProperty('--lvl', '0')
      return
    }
    let frame = 0
    let level = 0
    const tick = (time: number) => {
      const { mic, ai } = getLevels()
      let target = 0.04
      if (status === 'speaking') target = ai
      else if (status === 'listening') target = mic
      else if (status === 'thinking') target = 0.2 + 0.15 * Math.sin(time / 280)
      // Rise quickly, fall slowly: it reads as sound, not as flicker.
      level += (target - level) * (target > level ? 0.4 : 0.12)
      root.style.setProperty('--lvl', level.toFixed(3))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [status, getLevels])

  const active = status === 'listening' || status === 'speaking' || status === 'thinking' || status === 'muted'
  const dim = status === 'connecting' || status === 'idle' || status === 'ended' || status === 'error'

  return (
    <div ref={rootRef} aria-hidden="true" className="flex min-h-0 w-full flex-1 flex-col items-center [--lvl:0]">
      {/* The orb takes whatever height is left on the screen, so everything fits without scrolling. */}
      <div className="relative min-h-[7rem] w-full flex-1">
      <div className="absolute top-1/2 left-1/2 aspect-square h-[min(80%,17.5rem,62vw)] -translate-x-1/2 -translate-y-1/2">
        {/* Soft rings that breathe with the sound. */}
        <span className="absolute -inset-[14%] rounded-full border border-brand/10 [transform:scale(calc(1+var(--lvl)*0.05))]" />
        <span className="absolute -inset-[28%] rounded-full border border-brand/[0.07] [transform:scale(calc(1+var(--lvl)*0.08))]" />
        <span className="absolute -inset-[42%] rounded-full border border-brand/[0.04] [transform:scale(calc(1+var(--lvl)*0.1))]" />
        <span className="absolute -inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(47,160,126,0.22)_40%,transparent_70%)] [opacity:calc(0.35+var(--lvl)*0.65)]" />

        <div
          className={`relative size-full overflow-hidden rounded-full bg-[radial-gradient(circle_at_34%_26%,#9be3c3_0%,#3fae85_30%,#17745a_58%,#0b4a3a_100%)] shadow-[0_1.5rem_3.5rem_rgba(23,107,89,0.3),inset_0_-1.25rem_2.5rem_rgba(0,30,20,0.35),inset_0_0.75rem_1.5rem_rgba(255,255,255,0.25)] transition-[filter,opacity] duration-500 [transform:scale(calc(1+var(--lvl)*0.06))] ${
            dim ? 'opacity-70 saturate-50' : status === 'muted' ? 'saturate-75' : ''
          }`}
        >
          {/* Slow, blurred bands of light and shade give the surface its marbled, flowing look. */}
          <span className="absolute -inset-[25%] rounded-full bg-[conic-gradient(from_20deg,transparent_0%,rgba(3,40,30,0.7)_14%,transparent_32%,rgba(200,248,226,0.5)_50%,transparent_64%,rgba(3,40,30,0.55)_82%,transparent_100%)] blur-[1rem] motion-safe:animate-[spin_22s_linear_infinite]" />
          <span className="absolute -inset-[10%] rounded-full bg-[radial-gradient(ellipse_60%_38%_at_30%_70%,rgba(4,48,36,0.75),transparent_70%)] blur-[0.6rem] motion-safe:animate-[spin_18s_linear_infinite]" />
          <span className="absolute -inset-[10%] rounded-full bg-[radial-gradient(ellipse_52%_30%_at_72%_32%,rgba(190,245,222,0.7),transparent_70%)] blur-[0.9rem] motion-safe:animate-[spin_26s_linear_infinite_reverse]" />
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,transparent_55%,rgba(2,30,22,0.35)_100%)]" />
          <svg viewBox="0 0 100 100" focusable="false" className="absolute top-1/2 left-1/2 size-[24%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_0.6rem_rgba(255,255,255,0.55)]">
            <path fill="#fff" d="M50 8C50 30 70 50 92 50C70 50 50 70 50 92C50 70 30 50 8 50C30 50 50 30 50 8Z" />
          </svg>
        </div>
      </div>

      </div>

      <div className="flex h-[2.25rem] shrink-0 items-center gap-[0.4rem] [@media(min-height:760px)]:h-[3rem]">
        {BARS.map((bar, index) => (
          <span
            key={index}
            style={{ '--b': `${bar.base}rem`, '--k': `${bar.gain}rem` } as React.CSSProperties}
            className={`w-[0.3rem] rounded-full transition-colors duration-300 [height:calc(var(--b)+var(--lvl)*var(--k))] ${active ? 'bg-brand' : 'bg-brand/40'}`}
          />
        ))}
      </div>
    </div>
  )
}
