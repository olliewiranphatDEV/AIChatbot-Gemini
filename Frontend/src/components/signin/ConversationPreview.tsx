import { typography } from '../../styles/typography.ts'
import BrandLogo from '../shared/BrandLogo.tsx'

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={`${className ?? ""} text-muted`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c0-3.6 3.4-5.5 7.5-5.5s7.5 1.9 7.5 5.5c0 .6-.4 1-1 1h-13c-.6 0-1-.4-1-1z" />
    </svg>
  )
}

/** Static illustration of a chat exchange; not interactive. */
export default function ConversationPreview() {
  return (
    <div
      className="w-full max-w-[37.875rem] rounded-[1.25rem] bg-surface px-[1rem] pt-[1.25rem] pb-[1.5rem] shadow-[0.5rem_0.875rem_2.25rem_rgba(30,70,50,0.1)] desk:h-[21.5rem] desk:rounded-[1.75rem] desk:px-[1.75rem] desk:pt-[2.125rem] desk:pb-[2.5rem]"
      aria-hidden="true"
    >
      <div className="flex items-start justify-end gap-[0.625rem] desk:gap-[0.9375rem]">
        <p className={`${typography.body} flex min-h-[2.75rem] items-center rounded-[0.875rem] bg-bubble px-[1rem] py-[0.5rem] text-ink desk:h-16 desk:rounded-2xl desk:px-[1.375rem] desk:py-0`}>
          Help me turn an idea into a plan.
        </p>
        <span className="flex size-[2.25rem] shrink-0 items-center justify-center rounded-full bg-bubble desk:mt-[0.4375rem] desk:size-[2.625rem]">
          <PersonIcon className="size-[1.25rem] desk:size-[1.5rem]" />
        </span>
      </div>

      <div className="mt-[0.75rem] flex items-start gap-[0.625rem] desk:mt-[1.375rem] desk:gap-[1.375rem]">
        <BrandLogo className="size-[2.25rem] shrink-0 desk:size-[2.875rem]" />
        <div className="min-w-0 max-w-[23.625rem] flex-1 rounded-[0.875rem] bg-fill px-[1rem] pt-[0.875rem] pb-[1rem] desk:min-h-[11.5625rem] desk:rounded-2xl desk:px-[1.375rem] desk:pt-[1rem] desk:pb-[1.5rem]">
          <h3 className={`${typography.subheading} text-ink`}>
            Let’s start with your goal.
          </h3>
          {/* On a phone or tablet that is not tall enough, only the heading is shown so the whole sign-in fits one screen. */}
          <div className="hidden [@media(min-height:980px)_and_(max-width:639px)]:block [@media(min-height:1250px)_and_(min-width:640px)]:block desk:block">
            <p className={`${typography.description} mt-[0.375rem] text-ink-soft desk:mt-[0.5625rem]`}>
              What do you want to achieve? A clear goal will help us break your idea into simple,
              actionable steps.
            </p>
            <div className="mt-[0.75rem] flex gap-[0.4375rem] desk:mt-[1.34rem]">
              <span className="size-[0.4375rem] rounded-full bg-faint" />
              <span className="size-[0.4375rem] rounded-full bg-faint" />
              <span className="size-[0.4375rem] rounded-full bg-faint" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
