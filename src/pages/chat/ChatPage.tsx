import { useEffect, useRef, useState } from 'react'
import ChatComposer from '../../components/chat/ChatComposer.tsx'
import ChatHeader from '../../components/chat/ChatHeader.tsx'
import ChatSidebar from '../../components/chat/ChatSidebar.tsx'
import MessageList from '../../components/chat/MessageList.tsx'
import {
  initialActiveConversationId,
  mockConversations,
  mockMessages,
  mockUser,
} from '../../data/mockChat.ts'
import type { ChatMessageData, Conversation } from '../../types/chat.ts'

const NEW_CHAT_TITLE = 'New chat'

function formatTime(date: Date): string {
  // Newer ICU builds put a narrow no-break space before AM/PM.
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
    .format(date)
    .replace(/ /g, ' ')
}

// Local-only state: nothing is sent anywhere yet (no Gemini/backend), so sending
// adds the user's message but never fabricates an AI reply.
export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [activeId, setActiveId] = useState(initialActiveConversationId)
  const [messagesByChat, setMessagesByChat] =
    useState<Record<string, ChatMessageData[]>>(mockMessages)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
  }

  const startNewChat = () => {
    nextId.current += 1
    const id = `chat-new-${nextId.current}`
    setConversations((current) => [{ id, title: NEW_CHAT_TITLE, group: 'Today' }, ...current])
    setActiveId(id)
    setSidebarOpen(false)
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
    // Name a fresh chat after its first message.
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeId && conversation.title === NEW_CHAT_TITLE
          ? { ...conversation, title: text.length > 40 ? `${text.slice(0, 40).trimEnd()}…` : text }
          : conversation,
      ),
    )
  }

  const stopGenerating = () => {
    setMessagesByChat((current) => ({
      ...current,
      [activeId]: (current[activeId] ?? []).map((message) =>
        message.status === 'generating' ? { ...message, status: 'done' } : message,
      ),
    }))
  }

  // Placeholders: Settings and the three-dot menus are built in a later iteration.
  const openSettings = () => {}
  const openItemMenu = (id: string) => {
    void id
  }
  const openChatMenu = () => {}

  return (
    <div className="chat-root flex h-dvh overflow-hidden bg-[#f9f9f7] text-[#050a12]">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        user={mockUser}
        open={sidebarOpen}
        onSelect={selectConversation}
        onNewChat={startNewChat}
        onOpenSettings={openSettings}
        onOpenItemMenu={openItemMenu}
      />
      {sidebarOpen && (
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 desk:hidden"
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          title={activeConversation?.title ?? NEW_CHAT_TITLE}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenMenu={openChatMenu}
        />
        <MessageList conversationId={activeId} messages={messages} />
        <ChatComposer isGenerating={isGenerating} onSend={sendMessage} onStop={stopGenerating} />
      </main>
    </div>
  )
}
