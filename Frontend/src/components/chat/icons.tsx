type IconProps = {
  className?: string
}

const base = { 'aria-hidden': true, focusable: false } as const

export function ChatBubbleIcon({ className, rounded = false }: IconProps & { rounded?: boolean }) {
  return (
    <svg
      {...base}
      className={className}
      viewBox="0 0 21 21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    >
      <path d={rounded
        ? 'M19 9.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.5-.7L1.5 19l1.4-5.3A8.5 8.5 0 1 1 19 9.5Z'
        : 'M3.5 2h14a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H8.5L4 19.5v-4h-.5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z'} />
    </svg>
  )
}

export function EllipsisIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} viewBox="0 0 23 5" fill="currentColor">
      <circle cx="2.5" cy="2.5" r="2" />
      <circle cx="11.5" cy="2.5" r="2" />
      <circle cx="20.5" cy="2.5" r="2" />
    </svg>
  )
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg
      {...base}
      className={className}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <path d="M9 1.5v15M1.5 9h15" />
    </svg>
  )
}

export function GearIcon({ className }: IconProps) {
  return (
    <svg
      {...base}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg
      {...base}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M3.5 6h17M3.5 12h17M3.5 18h17" />
    </svg>
  )
}

export function StopSquareIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} viewBox="0 0 21 21" fill="currentColor">
      <rect width="21" height="21" rx="4.5" />
    </svg>
  )
}

export function SendArrowIcon({ className }: IconProps) {
  return (
    <svg
      {...base}
      className={className}
      viewBox="0 0 21 21"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.5 18V3.5M4 9.5l6.5-6.5 6.5 6.5" />
    </svg>
  )
}

export function MicIcon({ className }: IconProps) {
  return (
    <svg
      {...base}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="2.5" width="6" height="12" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5M8.5 21.5h7" />
    </svg>
  )
}

export function MicOffIcon({ className }: IconProps) {
  return (
    <svg
      {...base}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 9.5v2a3 3 0 0 0 4.7 2.5M15 10.5V5.5a3 3 0 0 0-5.8-1M5.5 11.5a6.5 6.5 0 0 0 10.3 5.3M18.5 11.5c0 .9-.2 1.8-.5 2.6M12 18v3.5M8.5 21.5h7M3 3l18 18" />
    </svg>
  )
}

/** Sound-wave bars: the Live (real-time conversation) mark. */
export function LiveWaveIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" />
    </svg>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function CaptionsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M10 10.3a2.2 2.2 0 1 0 0 3.4M17 10.3a2.2 2.2 0 1 0 0 3.4" />
    </svg>
  )
}

/** Handset laid flat: the hang-up mark of the End live button. */
export function HangUpIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 8.5c-3.1 0-5.9.9-8.2 2.4-.6.4-.9 1-.9 1.7v1.2c0 .8.7 1.4 1.5 1.3l2.6-.4c.6-.1 1-.6 1-1.2v-.9c1.2-.4 2.7-.6 4-.6s2.8.2 4 .6v.9c0 .6.4 1.1 1 1.2l2.6.4c.8.1 1.500-.5 1.500-1.300v-1.2c0-.7-.3-1.300-.9-1.700-2.300-1.500-5.100-2.400-8.200-2.400z" />
    </svg>
  )
}
