import { useEffect, useRef, useState } from 'react'
import ChatComposer from '../../components/chat/ChatComposer.tsx'
import ChatHeader from '../../components/chat/ChatHeader.tsx'
import ChatSidebar from '../../components/chat/ChatSidebar.tsx'
import MessageList from '../../components/chat/MessageList.tsx'
import type { ChatMessageData, Conversation } from '../../types/chat.ts'
import type { WorkspaceSession } from '../../types/auth.ts'
import SettingsPage from '../settings/SettingsPage.tsx'
import type { ThemePreference } from '../../components/settings/ThemeSelector.tsx'

const NEW_CHAT_TITLE = 'New chat'

function formatTime(date: Date): string {
  // Newer ICU builds put a narrow no-break space before AM/PM.
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
    .format(date)
    .replace(/ /g, ' ')
}

// Local-only state: nothing is sent anywhere yet (no Gemini/backend), so sending
// adds the user's message but never fabricates an AI reply.
type ChatPageProps = {
  session: WorkspaceSession
  activePage: 'chat' | 'settings'
  onNavigate: (path: '/chat' | '/settings') => void
  onThemeChange?: (theme: ThemePreference) => void
  onLogout?: () => void
  loggingOut?: boolean
  logoutError?: string | null
}

export default function ChatPage({ activePage, onNavigate, onThemeChange, onLogout, loggingOut, logoutError }: ChatPageProps) {
  const isSettings = activePage === 'settings'
  const user = { name: 'Guest' }
  const conversations: Conversation[] = []
  const [activeId, setActiveId] = useState('chat-current')
  const [messagesByChat, setMessagesByChat] =
    useState<Record<string, ChatMessageData[]>>({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<ThemePreference>('light')
  const nextId = useRef(0)

  const activeConversation = conversations.find((conversation) => conversation.id === activeId)
  const messages = messagesByChat[activeId] ?? []
  const isGenerating = messages.some((message) => message.status === 'generating')

  useEffect(() => {
    if (!sidebarOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sidebarOpen])

  const selectConversation = (id: string) => {
    setActiveId(id)
    setSidebarOpen(false)
    onNavigate('/chat')
  }

  const startNewChat = () => {
    nextId.current += 1
    const id = `chat-new-${nextId.current}`
    // Guest keeps only its current conversation in memory.
    setMessagesByChat({})
    setActiveId(id)
    setSidebarOpen(false)
    onNavigate('/chat')
  }

  const sendMessage = (text: string) => {
    nextId.current += 1
    const message: ChatMessageData = {
      id: `m-local-${nextId.current}`,
      role: 'user',
      sentAt: formatTime(new Date()),
      blocks: [{ type: 'paragraph', text }],
    }
    setMessagesByChat((current) => ({
      ...current,
      [activeId]: [...(current[activeId] ?? []), message],
    }))

  }

  const stopGenerating = () => {
    setMessagesByChat((current) => ({
      ...current,
      [activeId]: (current[activeId] ?? []).map((message) =>
        message.status === 'generating' ? { ...message, status: 'done' } : message,
      ),
    }))
  }

  const openSettings = () => {
    setSidebarOpen(false)
    onNavigate('/settings')
  }
  const changeTheme = (value: ThemePreference) => {
    setTheme(value)
    onThemeChange?.(value)
  }
  // The three-dot menus remain placeholders until their own implementation.
  const openItemMenu = (id: string) => {
    void id
  }
  const openChatMenu = () => {}

  return (
    // Match Chat's desktop rem sizing on Settings, using a Tailwind ancestor
    // variant so the existing global CSS and Chat appearance stay unchanged.
    <div className={`${isSettings ? 'settings-root desk:[html:has(&)]:text-[clamp(12px,min(calc(100vw/96),calc(100vh/64)),16px)]!' : 'chat-root'} flex h-dvh overflow-hidden bg-[#f9f9f7] text-[#050a12]`}>
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        user={user}
        open={sidebarOpen}
        onSelect={selectConversation}
        onNewChat={startNewChat}
        onOpenSettings={openSettings}
        onOpenItemMenu={openItemMenu}
        variant={isSettings ? 'settings' : 'chat'}
      />
      {sidebarOpen && (
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 desk:hidden"
        />
      )}

      <main className={`${isSettings ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col`}>
        <ChatHeader
          title={activeConversation?.title ?? NEW_CHAT_TITLE}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenMenu={openChatMenu}
        />
        <MessageList conversationId={activeId} messages={messages} />
        <ChatComposer key={activeId} isGenerating={isGenerating} onSend={sendMessage} onStop={stopGenerating} />
      </main>
      {isSettings && (
        <SettingsPage
          user={user}
          isGuest
          theme={theme}
          onThemeChange={changeTheme}
          onLogout={onLogout}
          loggingOut={loggingOut}
          logoutError={logoutError}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          onBackToChat={() => { setSidebarOpen(false); onNavigate('/chat') }}
        />
      )}
    </div>
  )
}
