import BrandLogo from './BrandLogo.tsx'

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#7e9088" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c0-3.6 3.4-5.5 7.5-5.5s7.5 1.9 7.5 5.5c0 .6-.4 1-1 1h-13c-.6 0-1-.4-1-1z" />
    </svg>
  )
}

/** Static illustration of a chat exchange; not interactive. */
export default function ConversationPreview() {
  return (
    <div
      className="w-full max-w-[37.875rem] rounded-[1.75rem] bg-[#fafbf9] px-[1.75rem] pt-[2.125rem] pb-[2.5rem] shadow-[0.5rem_0.875rem_2.25rem_rgba(30,70,50,0.1)] lg:h-[21.5rem]"
      aria-hidden="true"
    >
      <div className="flex items-start justify-end gap-[0.9375rem]">
        <p className="flex h-16 items-center rounded-2xl bg-[#e9f0ec] px-[1.375rem] text-[1.1375rem] text-[#06090d]">
          Help me turn an idea into a plan.
        </p>
        <span className="mt-[0.4375rem] flex size-[2.625rem] shrink-0 items-center justify-center rounded-full bg-[#ecf2ee]">
          <PersonIcon className="size-[1.5rem]" />
        </span>
      </div>

      <div className="mt-[1.375rem] flex items-start gap-[1.375rem]">
        <BrandLogo className="size-[2.875rem] shrink-0" />
        <div className="min-w-0 max-w-[23.625rem] min-h-[11.5625rem] flex-1 rounded-2xl bg-[#f3f4f3] px-[1.375rem] pt-[1rem] pb-[1.5rem]">
          <h3 className="text-[1.18rem] leading-7 font-semibold text-[#06090d]">
            Let’s start with your goal.
          </h3>
          <p className="mt-[0.5625rem] text-[1.1rem] leading-[1.6875rem] text-[#374047]">
            What do you want to achieve? A clear goal will help us break your idea into simple,
            actionable steps.
          </p>
          <div className="mt-[1.34rem] flex gap-[0.4375rem]">
            <span className="size-[0.4375rem] rounded-full bg-[#a8aeb0]" />
            <span className="size-[0.4375rem] rounded-full bg-[#a8aeb0]" />
            <span className="size-[0.4375rem] rounded-full bg-[#a8aeb0]" />
          </div>
        </div>
      </div>
    </div>
  )
}
