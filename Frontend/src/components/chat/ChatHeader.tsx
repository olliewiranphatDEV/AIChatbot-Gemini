import SidebarToggle from '../shared/SidebarToggle.tsx'
import { typography } from '../../styles/typography.ts'
import { LiveWaveIcon } from './icons.tsx'

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
      <div className="flex h-[4.25rem] w-full items-center gap-[20px] pr-[24px] pl-[5px] sm:h-[5rem] sm:pl-[24px] lg:h-[5.75rem]">
        {!sidebarOpen && <SidebarToggle expanded={false} onToggle={onOpenSidebar} />}
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
