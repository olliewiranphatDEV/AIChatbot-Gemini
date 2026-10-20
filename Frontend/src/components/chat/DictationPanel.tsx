import { typography } from '../../styles/typography.ts'
import type { DictationState } from '../../voice/dictation.ts'
import { MAX_RECORDING_SECONDS } from '../../voice/wav.ts'
import { MicIcon, StopSquareIcon } from './icons.tsx'

type DictationPanelProps = {
  state: DictationState
  onStop: () => void
  onCancel: () => void
  onRetry: () => void
}

const buttonClass =
  'flex min-h-[2.75rem] cursor-pointer items-center justify-center gap-[0.5rem] rounded-[0.8125rem] px-[1rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
const secondaryButton = `${buttonClass} border border-line bg-surface text-brand hover:bg-hover`
const primaryButton = `${buttonClass} bg-brand text-on-brand hover:bg-brand-hover`

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** Shown above the message box while the user dictates a message with the Voice button. */
export default function DictationPanel({ state, onStop, onCancel, onRetry }: DictationPanelProps) {
  if (state.phase === 'idle') return null

  return (
    <section
      aria-label="Voice input"
      className="mb-[0.5rem] flex flex-wrap items-center gap-x-[1rem] gap-y-[0.5rem] rounded-[1rem] border border-line bg-selected px-[0.875rem] py-[0.625rem] lg:px-[1.25rem]"
    >
      <div role="status" aria-live="polite" className="flex min-w-0 flex-1 basis-[12rem] items-center gap-[0.625rem]">
        <span
          aria-hidden="true"
          className={`size-[0.625rem] shrink-0 rounded-full ${state.phase === 'error' ? 'bg-danger' : state.phase === 'recording' ? 'animate-pulse bg-[#d92d20]' : 'animate-pulse bg-[#c58a1d]'}`}
        />
        <div className="min-w-0">
          {state.phase === 'recording' && (
            <>
              <p className={`${typography.description} font-medium text-ink`}>
                Recording {clock(state.seconds)} <span className="text-muted">/ {clock(MAX_RECORDING_SECONDS)}</span>
              </p>
              <p className={`${typography.status} text-ink-2`}>Press End when you finish. You can check and edit the text before sending.</p>
            </>
          )}
          {state.phase === 'transcribing' && (
            <>
              <p className={`${typography.description} font-medium text-ink`}>Converting your speech to text...</p>
              <p className={`${typography.status} text-ink-2`}>Nothing is sent to the AI chat until you press Send.</p>
            </>
          )}
          {state.phase === 'error' && (
            <p role="alert" className={`${typography.description} text-danger [overflow-wrap:anywhere]`}>
              {state.message}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-[0.5rem]">
        {state.phase === 'recording' && (
          <button type="button" onClick={onStop} aria-label="End recording" className={primaryButton}>
            <StopSquareIcon className="size-[1rem]" />
            <span className={typography.compactButton}>End</span>
          </button>
        )}
        {state.phase === 'error' && state.canRetry && (
          <button type="button" onClick={onRetry} className={primaryButton}>
            <MicIcon className="size-[1.25rem]" />
            <span className={typography.compactButton}>Try again</span>
          </button>
        )}
        <button type="button" onClick={onCancel} aria-label={state.phase === 'error' ? 'Dismiss' : 'Cancel recording'} className={secondaryButton}>
          <span className={typography.compactButton}>{state.phase === 'error' ? 'Dismiss' : 'Cancel'}</span>
        </button>
      </div>
    </section>
  )
}
