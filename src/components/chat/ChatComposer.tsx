import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { SendArrowIcon, StopSquareIcon } from './icons.tsx'

type ChatComposerProps = {
  isGenerating: boolean
  onSend: (text: string) => void
  onStop: () => void
}

const MAX_HEIGHT_REM = 12

export default function ChatComposer({ isGenerating, onSend, onStop }: ChatComposerProps) {
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = draft.trim().length > 0 && !isGenerating

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
    <div className="shrink-0 bg-[#f9f9f7] pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-[1.0625rem]">
      <div className="mx-auto w-full max-w-[72rem] px-[0.75rem] pt-[0.75rem] sm:px-[1.5rem] lg:pt-[1.25rem] lg:pr-[1.9375rem] lg:pl-[1.8125rem]">
        <form
          onSubmit={handleSubmit}
          className="flex items-start gap-[0.5rem] rounded-[1rem] border border-[#e3e5e6] bg-white p-[0.5rem] shadow-[0_2px_10px_rgba(30,40,35,0.07)] lg:gap-[0.8125rem] lg:p-[0.8rem]"
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message AI Chat..."
            aria-label="Message AI Chat"
            className="block min-h-[4.5rem] w-full min-w-0 resize-none rounded-[0.625rem] border border-[#e5e7e8] bg-white p-[0.875rem] text-[clamp(1rem,4vw,1.205rem)] leading-7 text-[#050a12] placeholder:text-[#666972] focus:outline-none focus-visible:border-[#186e5c] focus-visible:ring-1 focus-visible:ring-[#186e5c] lg:min-h-[6.1875rem] lg:p-[1.2rem]"
          />
          {/* Distinct keys: otherwise React reuses one <button> and flips it to type=submit mid-click, so Stop would also send the draft. */}
          {isGenerating ? (
            <button
              key="stop"
              type="button"
              onClick={onStop}
              className="flex h-[4.5rem] w-[3.5rem] shrink-0 cursor-pointer flex-col items-center justify-center gap-[0.375rem] rounded-[0.8125rem] bg-[#176b59] text-white transition-colors hover:bg-[#135a4a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b59] lg:h-[4.9375rem] lg:w-[4.25rem] lg:justify-start lg:gap-[0.6875rem] lg:pt-[1.1875rem]"
            >
              <StopSquareIcon className="size-[1.3125rem]" />
              <span className="text-[0.84rem] leading-5 font-medium">Stop</span>
            </button>
          ) : (
            <button
              key="send"
              type="submit"
              disabled={!canSend}
              className="flex h-[4.5rem] w-[3.5rem] shrink-0 cursor-pointer flex-col items-center justify-center gap-[0.375rem] rounded-[0.8125rem] bg-[#176b59] text-white transition-colors hover:bg-[#135a4a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b59] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#176b59] lg:h-[4.9375rem] lg:w-[4.25rem] lg:justify-start lg:gap-[0.6875rem] lg:pt-[1.1875rem]"
            >
              <SendArrowIcon className="size-[1.3125rem]" />
              <span className="text-[0.84rem] leading-5 font-medium">Send</span>
            </button>
          )}
        </form>
        <p className="mt-[0.6rem] text-center text-[clamp(0.75rem,2.9vw,0.915rem)] leading-[1.375rem] text-[#73777f] lg:pr-[5.0625rem] lg:pl-[0.875rem]">
          AI can make mistakes. Check important information.
        </p>
      </div>
    </div>
  )
}
