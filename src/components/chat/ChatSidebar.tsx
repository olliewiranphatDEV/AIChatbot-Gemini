import { conversationGroups } from '../../data/mockChat.ts'
import type { ChatUser, Conversation } from '../../types/chat.ts'
import BrandLogo from '../shared/BrandLogo.tsx'
import { ChatBubbleIcon, EllipsisIcon, GearIcon, PlusIcon } from './icons.tsx'

type ChatSidebarProps = {
  conversations: readonly Conversation[]
  activeId: string
  user: ChatUser
  /** Drawer state when not on the desk layout (see index.css). Ignored on it, where the sidebar is always visible. */
  open: boolean
  onSelect: (id: string) => void
  onNewChat: () => void
  onOpenSettings: () => void
  onOpenItemMenu: (id: string) => void
}

export default function ChatSidebar({
  conversations,
  activeId,
  user,
  open,
  onSelect,
  onNewChat,
  onOpenSettings,
  onOpenItemMenu,
}: ChatSidebarProps) {
  return (
    <aside
      id="chat-sidebar"
      aria-label="Chat history"
      className={`fixed inset-y-0 left-0 z-40 flex w-[min(88vw,24.0625rem)] flex-col border-r border-[#e7e8e7] bg-[#f0f1ef] transition-[transform,visibility] duration-200 desk:visible desk:static desk:z-auto desk:w-[24.0625rem] desk:translate-x-0 ${
        open ? 'translate-x-0' : 'invisible -translate-x-full'
      }`}
    >
      <div className="flex items-center gap-[0.75rem] px-[1.9375rem] pt-[1.4375rem]">
        <BrandLogo className="size-[2.8125rem] shrink-0" color="#0d5d4c" />
        <span className="text-[1.825rem] leading-none font-semibold text-[#050b16]">AI Chat</span>
      </div>

      <div className="pt-[1.5625rem] pr-[1.875rem] pl-[1.9375rem]">
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-[3.625rem] w-full cursor-pointer items-center justify-center gap-[1rem] rounded-[0.625rem] bg-[#186e5c] text-[1.195rem] font-medium text-white transition-colors hover:bg-[#145f4f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#186e5c]"
        >
          <PlusIcon className="size-[1.125rem]" />
          New chat
        </button>
      </div>

      <nav
        aria-label="Conversations"
        className="mt-[1.9375rem] min-h-0 flex-1 overflow-y-auto pr-[1.0625rem] pl-[1.1875rem]"
      >
        {conversationGroups.map((group, groupIndex) => {
          const items = conversations.filter((conversation) => conversation.group === group)
          if (items.length === 0) return null
          return (
            <section key={group} className={groupIndex > 0 ? 'mt-[1.9375rem]' : undefined}>
              <h2 className="pl-[0.78rem] text-[1.03rem] leading-6 text-[#5f615f]">{group}</h2>
              <ul className="mt-[0.625rem] flex flex-col gap-[0.25rem]">
                {items.map((conversation) => {
                  const selected = conversation.id === activeId
                  return (
                    <li
                      key={conversation.id}
                      className={`relative flex h-[3.5625rem] items-center overflow-hidden rounded-[0.5rem] transition-colors ${
                        selected ? 'bg-[#e4ebe6]' : 'hover:bg-[#e7ebe8]'
                      }`}
                    >
                      {selected && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-0 left-0 w-[0.1875rem] bg-[#025444]"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        aria-current={selected ? 'page' : undefined}
                        className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-[1.225rem] pl-[1.25rem] text-left text-[1.11rem] text-[#0a1016] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#186e5c]"
                      >
                        <ChatBubbleIcon className="size-[1.4375rem] shrink-0" />
                        <span className="min-w-0 truncate">{conversation.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenItemMenu(conversation.id)}
                        aria-label={`Options for ${conversation.title}`}
                        className="mr-[0.7rem] cursor-pointer rounded px-[0.5rem] py-[0.5rem] text-[#666b68] hover:text-[#2b302d] focus-visible:outline-2 focus-visible:outline-[#186e5c]"
                      >
                        <EllipsisIcon className="h-[0.3125rem] w-[1.1875rem]" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-[#e0e3e2] px-[1.9375rem] pt-[1.5rem] pb-[2.4375rem]">
        <div className="flex h-[2.6875rem] items-center gap-[1.6875rem]">
          <span
            aria-hidden="true"
            className="flex size-[2.6875rem] shrink-0 items-center justify-center rounded-full bg-[#d2d5da] text-[1.2rem] text-[#0a0d18]"
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 truncate text-[1.075rem] font-medium text-[#05070d]">
            {user.name}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="mt-[1.0625rem] flex h-[2.6875rem] w-full cursor-pointer items-center gap-[1.6875rem] rounded-[0.5rem] text-left text-[1.12rem] text-[#05070d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#186e5c]"
        >
          <span className="flex w-[2.6875rem] shrink-0 justify-center">
            <GearIcon className="size-[1.8125rem]" />
          </span>
          Settings
        </button>
      </div>
    </aside>
  )
}
