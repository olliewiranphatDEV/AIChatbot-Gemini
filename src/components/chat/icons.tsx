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
