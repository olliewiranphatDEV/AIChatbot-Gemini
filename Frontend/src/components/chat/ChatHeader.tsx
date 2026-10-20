import { typography } from '../../styles/typography.ts'
import { EllipsisIcon, MenuIcon } from './icons.tsx'

type ChatHeaderProps = {
  title: string
  sidebarOpen: boolean
  onOpenSidebar: () => void
  onOpenMenu: () => void
}

export default function ChatHeader({
  title,
  sidebarOpen,
  onOpenSidebar,
  onOpenMenu,
}: ChatHeaderProps) {
  return (
    <header className="shrink-0 border-b border-[#e6e8e9] bg-[#fdfdfd]">
      <div className="mx-auto flex h-[4.25rem] w-full max-w-[72rem] items-center gap-[0.5rem] [@media(max-height:500px)]:h-[3.5rem] px-[0.5rem] sm:h-[5rem] sm:px-[1rem] lg:h-[5.75rem] lg:pr-[1.75rem] desk:gap-0 desk:pl-[2.125rem]">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          aria-controls="chat-sidebar"
          aria-expanded={sidebarOpen}
          className="flex size-[2.75rem] shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#0a1016] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#186e5c] desk:hidden"
        >
          <MenuIcon className="size-[1.5rem]" />
        </button>
        <h1 className={`${typography.title} min-w-0 flex-1 truncate text-[#030918] lg:pb-[0.25rem]`}>
          {title}
        </h1>
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Chat options"
          className="shrink-0 cursor-pointer rounded px-[0.5rem] py-[0.75rem] text-[#6b6a6c] hover:text-[#2b2b2d] focus-visible:outline-2 focus-visible:outline-[#186e5c]"
        >
          <EllipsisIcon className="h-[0.3125rem] w-[1.4375rem]" />
        </button>
      </div>
    </header>
  )
}
