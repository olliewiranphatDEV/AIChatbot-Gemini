type SidebarToggleProps = {
  expanded: boolean
  onToggle: () => void
  className?: string
}

export default function SidebarToggle({ expanded, onToggle, className = '' }: SidebarToggleProps) {
  const label = expanded ? 'Close sidebar' : 'Open sidebar'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-controls="chat-sidebar"
      aria-expanded={expanded}
      title={label}
      className={`flex size-[44px] shrink-0 cursor-pointer items-center justify-center rounded-lg text-brand transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[24px]">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18" />
        <path d={expanded ? 'm16 9-3 3 3 3' : 'm13 9 3 3-3 3'} />
      </svg>
    </button>
  )
}
