import { useEffect, useRef, useState } from 'react'
import { blocksToText } from '../../api/chatMessages.ts'
import { typography } from '../../styles/typography.ts'
import type { ChatMessageData } from '../../types/chat.ts'
import { badgeText, deriveLiveStatus, formatElapsed, microphoneText } from '../../voice/liveStatus.ts'
import type { VoiceState } from '../../voice/state.ts'
import { CaptionsIcon, ChevronLeftIcon, ClockIcon, HangUpIcon, MicIcon, MicOffIcon } from '../chat/icons.tsx'
import BrandLogo from '../shared/BrandLogo.tsx'
import LiveOrb from './LiveOrb.tsx'

type LiveScreenProps = {
  state: VoiceState
  /** What was said in this Live conversation so far. Only the newest message is shown, as a caption. */
  messages: readonly ChatMessageData[]
  getLevels: () => { mic: number; ai: number }
  onMute: () => void
  onUnmute: () => void
  /** Start (or restart) the session. Needed on a direct visit, and after an error or an end. */
  onStart: () => void
  /** Close the session and return to the conversation Live was opened from. */
  onExit: () => void
}

const CAPTIONS_KEY = 'live-captions'

// Captions are on the first time; after that the user's choice is remembered on this device.
function readCaptionsPreference(): boolean {
  try {
    return window.localStorage.getItem(CAPTIONS_KEY) !== 'off'
  } catch {
    return true
  }
}

const circleButton =
  'flex size-[clamp(3.25rem,15vw,4.25rem)] cursor-pointer items-center justify-center rounded-full transition-[background-color,transform] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45'
const controlLabel = `${typography.caption} text-ink-soft`

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-[4.5rem] flex-col items-center gap-[0.5rem]">
      {children}
      <span className={controlLabel}>{label}</span>
    </div>
  )
}

/**
 * The Live conversation page. It is a view of a session owned by the chat page: everything
 * shown here (status, time, captions, mic state, orb motion) comes from the real session.
 */
export default function LiveScreen({ state, messages, getLevels, onMute, onUnmute, onStart, onExit }: LiveScreenProps) {
  const status = deriveLiveStatus(state)
  const badge = badgeText(state)
  const connecting = state.phase === 'connecting'
  const active = state.phase === 'active'
  const ready = state.phase === 'idle' || state.phase === 'ended' || state.phase === 'error'

  // ---- elapsed time: from the moment of connection to the end of the session ----
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setTick(Date.now()), 500)
    return () => clearInterval(timer)
  }, [active])
  const elapsed = state.connectedAt === undefined ? 0 : Math.max(0, ((state.endedAt ?? tick) - state.connectedAt) / 1000)

  // ---- captions ----
  const [captionsOn, setCaptionsOn] = useState(readCaptionsPreference)
  const toggleCaptions = () => {
    const next = !captionsOn
    setCaptionsOn(next)
    try {
      window.localStorage.setItem(CAPTIONS_KEY, next ? 'on' : 'off')
    } catch {
      // The preference just is not remembered.
    }
  }
  const newest = messages.at(-1)
  const captionText = newest ? blocksToText(newest.blocks) : ''
  const captionBox = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = captionBox.current
    if (el) el.scrollTop = el.scrollHeight
  }, [captionText, captionsOn])

  return (
    <div data-testid="live-scroll" className="h-dvh min-w-0 flex-1 overflow-y-auto bg-canvas text-ink">
      <div className="flex min-h-full flex-col pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-[0.5rem] border-b border-line bg-header px-[0.5rem] pt-[env(safe-area-inset-top)] sm:px-[1.5rem] lg:px-[2.25rem]">
          <button
            type="button"
            onClick={onExit}
            className="flex min-h-[3.5rem] min-w-[2.75rem] cursor-pointer items-center gap-[0.5rem] justify-self-start rounded-lg px-[0.5rem] text-ink hover:bg-hover focus-visible:outline-2 focus-visible:outline-brand sm:min-h-[4.5rem] lg:min-h-[5rem]"
          >
            <ChevronLeftIcon className="size-[1.5rem] shrink-0" />
            <span className={`${typography.description} sr-only min-[480px]:not-sr-only`}>Back to chat</span>
          </button>

          <div className="flex items-center gap-[0.5rem] sm:gap-[0.75rem]">
            <BrandLogo className="size-[2rem] shrink-0 sm:size-[2.5rem] lg:size-[2.75rem]" color="var(--color-logo-deep)" />
            <span className={`${typography.header} hidden min-[360px]:inline`}>AI Chat</span>
            <span
              className={`${typography.status} flex items-center gap-[0.4rem] rounded-full px-[0.75rem] py-[0.25rem] font-semibold tracking-wide ${
                badge.live ? 'bg-selected text-brand' : 'bg-fill text-ink-2'
              }`}
            >
              <span aria-hidden="true" className={`size-[0.5rem] rounded-full ${badge.live ? 'bg-brand' : connecting ? 'animate-pulse bg-[#c58a1d]' : 'bg-faint'}`} />
              {badge.label}
            </span>
          </div>

          <div className={`${typography.description} flex items-center gap-[0.4rem] justify-self-end pr-[0.5rem] text-ink-soft tabular-nums`}>
            <ClockIcon className="size-[1.25rem] shrink-0 sm:size-[1.5rem]" />
            <span aria-label="Elapsed time" role="timer">{formatElapsed(elapsed)}</span>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center px-[1rem] pt-[clamp(0.75rem,3dvh,2.5rem)] text-center sm:px-[1.5rem]">
          <p className={`${typography.eyebrow} text-accent-soft [@media(max-height:700px)]:hidden`}>Live conversation</p>
          <h1 className={`${typography.liveHeading} mt-[0.5rem] text-ink [@media(min-height:760px)]:mt-[0.75rem]`}>A little more human.</h1>
          <p className={`${typography.subtitle} mt-[0.375rem] max-w-[34rem] text-ink-2`}>Talk naturally. You can interrupt at any time.</p>

          <LiveOrb status={status.key} getLevels={getLevels} />

          <p role="status" aria-live="polite" aria-atomic="true" className={`${typography.liveStatus} mt-[0.25rem] ${status.key === 'error' ? 'text-danger' : 'text-brand'}`}>
            {status.label}
          </p>
          {state.phase === 'error' && state.error && (
            <p role="alert" className={`${typography.description} mt-[0.375rem] max-w-[34rem] text-danger [overflow-wrap:anywhere]`}>
              {state.error.message}
            </p>
          )}

          {/* Captions: the newest thing said, updated in place. Not a live region, so it is not read out word by word. */}
          {captionsOn && (
            <section aria-label="Live captions" className="mt-[0.5rem] flex min-h-[3.5rem] w-full max-w-[44rem] flex-col items-center [@media(min-height:760px)]:mt-[1rem] [@media(min-height:760px)]:min-h-[4.5rem]">
              <p className={`${typography.caption} text-muted [@media(max-height:700px)]:hidden`}>Live captions</p>
              <div ref={captionBox} className="mt-[0.25rem] max-h-[clamp(3.5rem,11dvh,7.5rem)] w-full overflow-y-auto px-[0.5rem]">
                {captionText ? (
                  <p
                    data-testid="live-caption"
                    className={`${typography.liveCaption} whitespace-pre-line [overflow-wrap:anywhere] ${newest?.status === 'interrupted' ? 'text-muted' : 'text-ink'}`}
                  >
                    {newest?.role === 'user' && <span className="mr-[0.5rem] text-accent-soft">You:</span>}
                    {captionText}
                  </p>
                ) : (
                  <p className={`${typography.description} text-faint`}>{active ? 'Captions appear here as you talk.' : ' '}</p>
                )}
              </div>
            </section>
          )}

          <div className="flex w-full shrink-0 flex-col items-center pt-[0.5rem]">
            {ready ? (
              <div className="flex flex-col items-center gap-[0.75rem]">
                <button
                  type="button"
                  onClick={onStart}
                  className={`${typography.button} flex min-h-[3.5rem] cursor-pointer items-center gap-[0.625rem] rounded-full bg-brand px-[2rem] text-on-brand shadow-[0_0.5rem_1.5rem_rgba(23,107,89,0.28)] transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}
                >
                  <MicIcon className="size-[1.375rem]" />
                  {state.phase === 'error' ? 'Try again' : 'Start live'}
                </button>
                <p className={`${typography.caption} text-muted`}>The microphone is only used after you press Start live.</p>
              </div>
            ) : (
              <div className="flex items-start justify-center gap-[clamp(1rem,6vw,2.75rem)] rounded-[1.5rem] border border-line bg-surface px-[clamp(1.25rem,6vw,2.5rem)] py-[0.75rem] shadow-[0_0.5rem_2rem_rgba(30,40,35,0.08)]">
                <Control label={state.muted ? 'Unmute' : 'Mute'}>
                  <button
                    type="button"
                    onClick={state.muted ? onUnmute : onMute}
                    disabled={!active}
                    aria-pressed={state.muted}
                    aria-label={state.muted ? 'Unmute microphone' : 'Mute microphone'}
                    className={`${circleButton} ${state.muted ? 'bg-selected-2 text-brand ring-2 ring-brand/40' : 'bg-selected text-brand hover:bg-selected-2'}`}
                  >
                    {state.muted ? <MicOffIcon className="size-[1.75rem]" /> : <MicIcon className="size-[1.75rem]" />}
                  </button>
                </Control>
                <Control label="Captions">
                  <button
                    type="button"
                    onClick={toggleCaptions}
                    aria-pressed={captionsOn}
                    aria-label={captionsOn ? 'Hide captions' : 'Show captions'}
                    className={`${circleButton} ${captionsOn ? 'bg-selected-2 text-brand ring-2 ring-brand/40' : 'bg-selected text-brand hover:bg-selected-2'}`}
                  >
                    <CaptionsIcon className="size-[1.75rem]" />
                  </button>
                </Control>
                <Control label="End live">
                  <button
                    type="button"
                    onClick={onExit}
                    aria-label="End live"
                    className={`${circleButton} bg-[#e2524f] text-white hover:bg-[#cf403d]`}
                  >
                    <HangUpIcon className="size-[1.75rem]" />
                  </button>
                </Control>
              </div>
            )}

            <p className={`${typography.status} mt-[0.625rem] flex items-center gap-[0.5rem] text-ink-2`}>
              {state.muted ? <MicOffIcon className="size-[1rem] shrink-0" /> : <MicIcon className="size-[1rem] shrink-0" />}
              <span>{microphoneText(state)}</span>
            </p>
            <p className={`${typography.caption} mt-[0.375rem] text-muted`}>AI can make mistakes. Check important information.</p>
          </div>
        </main>
      </div>
    </div>
  )
}
