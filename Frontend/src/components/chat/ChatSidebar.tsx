import { typography } from '../../styles/typography.ts'
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
  variant?: 'chat' | 'settings'
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
  variant = 'chat',
}: ChatSidebarProps) {
  const isSettings = variant === 'settings'
  return (
    <aside
      id="chat-sidebar"
      aria-label="Chat history"
      className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-[transform,visibility] duration-200 desk:visible desk:static desk:z-auto desk:translate-x-0 ${isSettings
        ? 'settings-sidebar w-[min(88vw,20.625rem)] shrink-0 border-r-0 bg-sidebar desk:w-[20.625rem]'
        : 'w-[min(88vw,24.0625rem)] border-r border-line bg-sidebar desk:w-[24.0625rem]'} ${
        open ? 'translate-x-0' : 'invisible -translate-x-full'
      }`}
    >
      <div className={`flex items-center ${isSettings ? 'gap-[0.9375rem] px-[1.625rem] pt-[1.5rem]' : 'gap-[0.75rem] px-[1.9375rem] pt-[1.4375rem]'}`}>
        <BrandLogo className="size-[2.8125rem] shrink-0" color="var(--color-logo-deep)" />
        <span className={`${typography.brand} text-ink`}>AI Chat</span>
      </div>

      <div className={isSettings ? 'pt-[1.5rem] pr-[1.375rem] pl-[1.5625rem]' : 'pt-[1.5625rem] pr-[1.875rem] pl-[1.9375rem]'}>
        <button
          type="button"
          onClick={onNewChat}
          className={`${typography.button} flex w-full cursor-pointer items-center rounded-[0.625rem] text-on-brand transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${isSettings
            ? 'h-[3.4375rem] justify-start gap-[1.1875rem] bg-brand pl-[1.5625rem] hover:bg-brand'
            : 'h-[3.625rem] justify-center gap-[1rem] bg-brand hover:bg-brand-hover'}`}
        >
          <PlusIcon className={isSettings ? 'size-[1.3125rem]' : 'size-[1.125rem]'} />
          New chat
        </button>
      </div>

      <nav
        aria-label="Conversations"
        className={`min-h-0 flex-1 overflow-y-auto ${isSettings ? 'mt-[2rem] pr-[1rem] pl-[1.5625rem]' : 'mt-[1.9375rem] pr-[1.0625rem] pl-[1.1875rem]'}`}
      >
        {conversationGroups.map((group, groupIndex) => {
          const items = conversations.filter((conversation) => conversation.group === group)
          if (items.length === 0) return null
          return (
            <section key={group} className={groupIndex > 0 ? (isSettings ? 'mt-[2rem]' : 'mt-[1.9375rem]') : undefined}>
              <h2 className={`${typography.sidebarGroup} text-ink-2 ${isSettings ? 'pl-[0.125rem]' : 'pl-[0.78rem]'}`}>{group}</h2>
              <ul className={`flex flex-col ${isSettings ? 'mt-[0.4375rem] gap-0' : 'mt-[0.625rem] gap-[0.25rem]'}`}>
                {items.map((conversation) => {
                  const selected = !isSettings && conversation.id === activeId
                  return (
                    <li
                      key={conversation.id}
                      className={`relative flex items-center overflow-hidden rounded-[0.5rem] transition-colors ${isSettings ? 'h-[3.125rem]' : 'h-[3.5625rem]'} ${
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
                        className={`${typography.sidebarHistory} flex h-full min-w-0 flex-1 cursor-pointer items-center text-left text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${isSettings ? 'gap-[1.375rem] pl-[0.6875rem]' : 'gap-[1.225rem] pl-[1.25rem]'}`}
                      >
                        <ChatBubbleIcon rounded={isSettings} className={`shrink-0 ${isSettings ? 'size-[1.5625rem] text-ink-soft' : 'size-[1.4375rem]'}`} />
                        <span className="min-w-0 truncate">{conversation.title}</span>
                      </button>
                      {!isSettings && <button
                        type="button"
                        onClick={() => onOpenItemMenu(conversation.id)}
                        aria-label={`Options for ${conversation.title}`}
                        className="mr-[0.7rem] cursor-pointer rounded px-[0.5rem] py-[0.5rem] text-ink-2 hover:text-ink-soft focus-visible:outline-2 focus-visible:outline-brand"
                      >
                        <EllipsisIcon className="h-[0.3125rem] w-[1.1875rem]" />
                      </button>}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </nav>

      <div className={`shrink-0 ${isSettings ? 'border-t-0 pt-[1.5rem] pr-[1.3125rem] pb-[3.125rem] pl-[1.5625rem] [@media(max-height:600px)]:pt-[0.75rem] [@media(max-height:600px)]:pb-[1rem]' : 'border-t border-line px-[1.9375rem] pt-[1.5rem] pb-[2.4375rem]'}`}>
        <div className={`flex h-[2.6875rem] items-center ${isSettings ? 'gap-[0.75rem] pl-[0.5625rem]' : 'gap-[1.6875rem]'}`}>
          <span
            aria-hidden="true"
            className={`${typography.sidebarAvatar} flex size-[2.6875rem] shrink-0 items-center justify-center rounded-full ${isSettings ? 'bg-logo text-white' : 'bg-avatar text-ink'}`}
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
          <span className={`${typography.sidebarUser} min-w-0 truncate text-ink`}>
            {user.name}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-current={isSettings ? 'page' : undefined}
          className={`${typography.label} flex w-full cursor-pointer items-center rounded-[0.5rem] text-left text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${isSettings ? 'mt-[0.6875rem] h-[3.125rem] gap-[0.625rem] bg-selected pl-[0.625rem]' : 'mt-[1.0625rem] h-[2.6875rem] gap-[1.6875rem]'}`}
        >
          <span className="flex w-[2.6875rem] shrink-0 justify-center">
            <GearIcon className={isSettings ? 'size-[1.6875rem]' : 'size-[1.8125rem]'} />
          </span>
          Settings
        </button>
      </div>
    </aside>
  )
}
