import { typography } from '../../styles/typography.ts'
import { conversationGroups } from '../../data/mockChat.ts'
import type { ChatUser, Conversation } from '../../types/chat.ts'
import SidebarToggle from '../shared/SidebarToggle.tsx'
import BrandLogo from '../shared/BrandLogo.tsx'
import { ChatBubbleIcon, EllipsisIcon, GearIcon, PlusIcon } from './icons.tsx'

type ChatSidebarProps = {
  conversations: readonly Conversation[]
  activeId: string
  user: ChatUser
  /** Shared visibility for the desktop sidebar and mobile drawer. */
  open: boolean
  onClose: () => void
  onSelect: (id: string) => void
  onNewChat: () => void
  onOpenSettings: () => void
  onOpenItemMenu: (id: string) => void
  isSettings: boolean
  onBackToChat: () => void
}

export default function ChatSidebar({
  conversations,
  activeId,
  user,
  open,
  onClose,
  onSelect,
  onNewChat,
  onOpenSettings,
  onOpenItemMenu,
  isSettings,
  onBackToChat,
}: ChatSidebarProps) {
  return (
    <aside
      id="chat-sidebar"
      aria-label="Chat history"
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col transition-[translate,margin-left,opacity] duration-300 ease-in-out motion-reduce:transition-none desk:static desk:z-auto w-[min(88vw,24.0625rem)] border-r border-line bg-sidebar desk:w-[24.0625rem] ${
        open ? 'translate-x-0 opacity-100 desk:ml-0' : 'pointer-events-none -translate-x-full opacity-0 desk:ml-[-24.0625rem]'
      }`}
    >
      <div className="flex items-center gap-[0.75rem] px-[1.9375rem] pt-[1.4375rem]">
        <BrandLogo className="size-[2.8125rem] shrink-0" color="var(--color-logo-deep)" />
        <span className={`${typography.brand} text-ink`}>AI Chat</span>
        <SidebarToggle expanded={open} onToggle={onClose} className="ml-auto" />
      </div>

      <div className="pt-[1.5625rem] pr-[1.875rem] pl-[1.9375rem]">
        <button
          type="button"
          onClick={onNewChat}
          className={`${typography.button} flex w-full cursor-pointer items-center rounded-[0.625rem] text-on-brand transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand h-[3.625rem] justify-center gap-[1rem] bg-brand hover:bg-brand-hover`}
        >
          <PlusIcon className="size-[1.125rem]" />
          New chat
        </button>
      </div>

      <nav
        aria-label="Conversations"
        className="min-h-0 flex-1 overflow-y-auto mt-[1.9375rem] pr-[1.0625rem] pl-[1.1875rem]"
      >
        {conversationGroups.map((group, groupIndex) => {
          const items = conversations.filter((conversation) => conversation.group === group)
          if (items.length === 0) return null
          return (
            <section key={group} className={groupIndex > 0 ? 'mt-[1.9375rem]' : undefined}>
              <h2 className={`${typography.sidebarGroup} text-ink-2 pl-[0.78rem]`}>{group}</h2>
              <ul className="flex flex-col mt-[0.625rem] gap-[0.25rem]">
                {items.map((conversation) => {
                  const selected = !isSettings && conversation.id === activeId
                  return (
                    <li
                      key={conversation.id}
                      className={`relative flex items-center overflow-hidden rounded-[0.5rem] transition-colors h-[3.5625rem] ${
                        selected ? 'bg-selected' : 'hover:bg-hover'
                      }`}
                    >
                      {selected && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-0 left-0 w-[0.1875rem] bg-brand"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        aria-current={selected ? 'page' : undefined}
                        className={`${typography.sidebarHistory} flex h-full min-w-0 flex-1 cursor-pointer items-center text-left text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand gap-[1.225rem] pl-[1.25rem]`}
                      >
                        <ChatBubbleIcon className="shrink-0 size-[1.4375rem]" />
                        <span className="min-w-0 truncate">{conversation.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenItemMenu(conversation.id)}
                        aria-label={`Options for ${conversation.title}`}
                        className="mr-[0.7rem] cursor-pointer rounded px-[0.5rem] py-[0.5rem] text-ink-2 hover:text-ink-soft focus-visible:outline-2 focus-visible:outline-brand"
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

      <div className="shrink-0 border-t border-line px-[1.9375rem] pt-[1.5rem] pb-[2.4375rem]">
        <button type="button" onClick={onBackToChat} title="Back to chat" className="flex h-[2.6875rem] w-full cursor-pointer rounded-[0.5rem] text-left hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand items-center gap-[1.6875rem]">
          <span
            aria-hidden="true"
            className={`${typography.sidebarAvatar} flex size-[2.6875rem] shrink-0 items-center justify-center rounded-full bg-logo text-white`}
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
          <span className={`${typography.sidebarUser} min-w-0 truncate text-ink`}>
            {user.name}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-current={isSettings ? 'page' : undefined}
          className={`${typography.label} flex w-full cursor-pointer items-center rounded-[0.5rem] text-left text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand mt-[1.0625rem] h-[2.6875rem] gap-[1.6875rem] ${isSettings ? 'bg-selected' : 'hover:bg-hover'}`}
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
