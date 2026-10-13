import { typography } from '../../styles/typography.ts'
import BrandLogo from '../shared/BrandLogo.tsx'

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
      className="w-full max-w-[37.875rem] rounded-[1.25rem] bg-[#fafbf9] px-[1rem] pt-[1.25rem] pb-[1.5rem] shadow-[0.5rem_0.875rem_2.25rem_rgba(30,70,50,0.1)] lg:h-[21.5rem] lg:rounded-[1.75rem] lg:px-[1.75rem] lg:pt-[2.125rem] lg:pb-[2.5rem]"
      aria-hidden="true"
    >
      <div className="flex items-start justify-end gap-[0.625rem] lg:gap-[0.9375rem]">
        <p className={`${typography.body} flex min-h-[2.75rem] items-center rounded-[0.875rem] bg-[#e9f0ec] px-[1rem] py-[0.5rem] text-[#06090d] lg:h-16 lg:rounded-2xl lg:px-[1.375rem] lg:py-0`}>
          Help me turn an idea into a plan.
        </p>
        <span className="flex size-[2.25rem] shrink-0 items-center justify-center rounded-full bg-[#ecf2ee] lg:mt-[0.4375rem] lg:size-[2.625rem]">
          <PersonIcon className="size-[1.25rem] lg:size-[1.5rem]" />
        </span>
      </div>

      <div className="mt-[0.75rem] flex items-start gap-[0.625rem] lg:mt-[1.375rem] lg:gap-[1.375rem]">
        <BrandLogo className="size-[2.25rem] shrink-0 lg:size-[2.875rem]" />
        <div className="min-w-0 max-w-[23.625rem] flex-1 rounded-[0.875rem] bg-[#f3f4f3] px-[1rem] pt-[0.875rem] pb-[1rem] lg:min-h-[11.5625rem] lg:rounded-2xl lg:px-[1.375rem] lg:pt-[1rem] lg:pb-[1.5rem]">
          <h3 className={`${typography.subheading} text-[#06090d]`}>
            Let’s start with your goal.
          </h3>
          <p className={`${typography.description} mt-[0.375rem] text-[#374047] lg:mt-[0.5625rem]`}>
            What do you want to achieve? A clear goal will help us break your idea into simple,
            actionable steps.
          </p>
          <div className="mt-[0.75rem] flex gap-[0.4375rem] lg:mt-[1.34rem]">
            <span className="size-[0.4375rem] rounded-full bg-[#a8aeb0]" />
            <span className="size-[0.4375rem] rounded-full bg-[#a8aeb0]" />
            <span className="size-[0.4375rem] rounded-full bg-[#a8aeb0]" />
          </div>
        </div>
      </div>
    </div>
  )
}
