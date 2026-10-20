import { typography } from '../../styles/typography.ts'
import { LiveWaveIcon, MenuIcon } from './icons.tsx'

type ChatHeaderProps = {
  title: string
  sidebarOpen: boolean
  onOpenSidebar: () => void
  onStartLive: () => void
  /** Live cannot start while a typed reply is being generated. */
  liveDisabled?: boolean
}

export default function ChatHeader({
  title,
  sidebarOpen,
  onOpenSidebar,
  onStartLive,
  liveDisabled = false,
}: ChatHeaderProps) {
  return (
    <header className="shrink-0 border-b border-line bg-header">
      <div className="mx-auto flex h-[4.25rem] w-full max-w-[72rem] items-center gap-[0.5rem] [@media(max-height:500px)]:h-[3.5rem] px-[0.5rem] sm:h-[5rem] sm:px-[1rem] lg:h-[5.75rem] lg:pr-[1.75rem] desk:gap-0 desk:pl-[2.125rem]">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          aria-controls="chat-sidebar"
          aria-expanded={sidebarOpen}
          className="flex size-[2.75rem] shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink hover:bg-hover focus-visible:outline-2 focus-visible:outline-brand desk:hidden"
        >
          <MenuIcon className="size-[1.5rem]" />
        </button>
        <h1 className={`${typography.title} min-w-0 flex-1 truncate text-ink lg:pb-[0.25rem]`}>
          {title}
        </h1>
        <button
          type="button"
          onClick={onStartLive}
          disabled={liveDisabled}
          aria-label="Start Live conversation"
          title="Live: talk with the AI in real time"
          className="flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center gap-[0.5rem] rounded-full border border-brand bg-surface px-[0.75rem] text-brand min-[360px]:px-[1rem] transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-surface"
        >
          <LiveWaveIcon className="size-[1.25rem]" />
          <span className={`${typography.compactButton} hidden min-[360px]:inline`}>Live</span>
        </button>
      </div>
    </header>
  )
}
