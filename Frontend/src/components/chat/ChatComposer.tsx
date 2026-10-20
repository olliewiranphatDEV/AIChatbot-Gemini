import { typography } from '../../styles/typography.ts'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useDictation } from '../../voice/useDictation.ts'
import { appendToDraft } from '../../voice/wav.ts'
import DictationPanel from './DictationPanel.tsx'
import { MicIcon, SendArrowIcon, StopSquareIcon } from './icons.tsx'

type ChatComposerProps = {
  isGenerating: boolean
  /** The Voice button (speak, review the text, send) is available. */
  dictationEnabled: boolean
  /** Changes when the open conversation or page changes; an unfinished recording is dropped then. */
  resetKey: string
  onSend: (text: string) => void
  onStop: () => void
}

const MAX_HEIGHT_REM = 12

export default function ChatComposer({ isGenerating, dictationEnabled, resetKey, onSend, onStop }: ChatComposerProps) {
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // A transcript is added to the draft for the user to review; it is never sent by itself.
  const dictation = useDictation((text) => {
    setDraft((current) => appendToDraft(current, text))
    textareaRef.current?.focus()
  })
  const cancelDictation = dictation.cancel
  useEffect(() => cancelDictation, [resetKey, dictationEnabled, cancelDictation])
  const canSend = draft.trim().length > 0 && !isGenerating && !dictation.busy

  // Grow with the text up to a cap; the CSS min-height keeps the resting size.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize)
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight + 2, MAX_HEIGHT_REM * rootPx)}px`
  }, [draft])

  const submit = () => {
    if (!canSend) return
    onSend(draft.trim())
    setDraft('')
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    // Enter confirms an IME candidate (Thai, Japanese, ...) rather than sending.
    // keyCode 229 covers Safari, which reports isComposing=false for that Enter.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    event.preventDefault()
    submit()
  }

  return (
    <div className="shrink-0 bg-canvas pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-[1.0625rem]">
      <div className="w-full px-[24px] pt-[0.75rem] lg:pt-[1.25rem]">
        <DictationPanel state={dictation.state} onStop={dictation.stop} onCancel={dictation.cancel} onRetry={dictation.retry} />
        <form
          onSubmit={handleSubmit}
          className="flex items-start gap-[0.5rem] rounded-[1rem] border border-line bg-surface p-[0.5rem] shadow-[0_2px_10px_rgba(30,40,35,0.07)] lg:gap-[0.8125rem] lg:p-[0.8rem]"
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message AI Chat..."
            aria-label="Message AI Chat"
            className={`${typography.input} block min-h-[3.5rem] w-full min-w-0 resize-none rounded-[0.625rem] border border-line bg-field p-[0.8125rem] text-ink placeholder:text-muted disabled:bg-fill focus:outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand lg:min-h-[4.25rem] lg:p-[1.2rem]`}
          />
          <button
            key="mic"
            type="button"
            onClick={dictation.start}
            disabled={isGenerating || dictation.busy || !dictationEnabled}
            aria-label="Voice input"
            title="Speak, then check the text before sending"
            className="flex h-[3.5rem] w-[3.5rem] shrink-0 cursor-pointer items-center justify-center rounded-[0.8125rem] border border-brand bg-surface text-brand transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-surface lg:h-[4.25rem] lg:w-[4.25rem]"
          >
            <MicIcon className="size-[1.5rem]" />
          </button>
          {/* Distinct keys: otherwise React reuses one <button> and flips it to type=submit mid-click, so Stop would also send the draft. */}
          {isGenerating ? (
            <button
              key="stop"
              type="button"
              onClick={onStop}
              aria-label="Stop"
              title="Stop"
              className="flex h-[3.5rem] w-[3.5rem] shrink-0 cursor-pointer items-center justify-center rounded-[0.8125rem] bg-brand text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:h-[4.25rem] lg:w-[4.25rem]"
            >
              <StopSquareIcon className="size-[1.375rem]" />
            </button>
          ) : (
            <button
              key="send"
              type="submit"
              disabled={!canSend}
              aria-label="Send"
              title="Send"
              className="flex h-[3.5rem] w-[3.5rem] shrink-0 cursor-pointer items-center justify-center rounded-[0.8125rem] bg-brand text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-brand lg:h-[4.25rem] lg:w-[4.25rem]"
            >
              <SendArrowIcon className="size-[1.5rem]" />
            </button>
          )}
        </form>
        <p className={`${typography.caption} mt-[0.6rem] text-center text-muted lg:pr-[5.0625rem] lg:pl-[0.875rem]`}>
          AI can make mistakes. Check important information.
        </p>
      </div>
    </div>
  )
}
