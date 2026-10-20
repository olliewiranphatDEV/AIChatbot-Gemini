import { useCallback, useEffect, useRef, useState } from 'react'
import { blocksToText, describeChatError, replyToBlocks, toApiMessages, toHistoryTurns } from '../../api/chatMessages.ts'
import { sendChatMessages } from '../../api/client.ts'
import ChatComposer from '../../components/chat/ChatComposer.tsx'
import ChatHeader from '../../components/chat/ChatHeader.tsx'
import LiveScreen from '../../components/live/LiveScreen.tsx'
import ChatSidebar from '../../components/chat/ChatSidebar.tsx'
import MessageList from '../../components/chat/MessageList.tsx'
import type { ChatMessageData, Conversation } from '../../types/chat.ts'
import { applyTranscriptEvent, emptyCursor } from '../../voice/transcript.ts'
import type { TranscriptCursor, TranscriptEvent } from '../../voice/transcript.ts'
import { useVoiceConversation } from '../../voice/useVoiceConversation.ts'
import type { WorkspaceSession } from '../../types/auth.ts'
import SettingsPage from '../settings/SettingsPage.tsx'
import type { ThemePreference } from '../../theme/theme.ts'

const NEW_CHAT_TITLE = 'New chat'

function formatTime(date: Date): string {
  // Newer ICU builds put a narrow no-break space before AM/PM.
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
    .format(date)
    .replace(/ /g, ' ')
}

// Conversations live in memory for this browser session (no database yet). Each
// sent message is answered by Gemini through the backend; if that fails the
// conversation shows the error and stays usable. No reply is ever invented.
type ChatPageProps = {
  session: WorkspaceSession
  activePage: 'chat' | 'settings' | 'live'
  onNavigate: (path: '/chat' | '/settings' | '/live') => void
  /** The user's theme choice and how to change it; owned by the app so every page shares it. */
  theme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
  onLogout?: () => void
  loggingOut?: boolean
  logoutError?: string | null
}

export default function ChatPage({ session, activePage, onNavigate, theme, onThemeChange, onLogout, loggingOut, logoutError }: ChatPageProps) {
  const isSettings = activePage === 'settings'
  const isLive = activePage === 'live'
  const isGuest = session.kind === 'guest'
  const user = isGuest ? { name: 'Guest' } : session.user
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState('chat-current')
  const [messagesByChat, setMessagesByChat] =
    useState<Record<string, ChatMessageData[]>>({})
  // Mirror of messagesByChat that is updated synchronously, so several voice transcript
  // events arriving in the same tick each build on the one before.
  const messagesRef = useRef<Record<string, ChatMessageData[]>>({})
  const updateMessages = (change: (current: Record<string, ChatMessageData[]>) => Record<string, ChatMessageData[]>) => {
    messagesRef.current = change(messagesRef.current)
    setMessagesByChat(messagesRef.current)
  }
  // The conversation the running voice session writes into, and where its current turn is.
  const voiceChatId = useRef<string | null>(null)
  const voiceCursor = useRef<TranscriptCursor>(emptyCursor)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const nextId = useRef(0)
  // The request in flight for each conversation. A reply is stored under the
  // conversation that asked for it, never under whichever one is open later.
  const requests = useRef(new Map<string, AbortController>())

  const activeConversation = conversations.find((conversation) => conversation.id === activeId)
  const messages = messagesByChat[activeId] ?? []
  const isGenerating = messages.some((message) => message.status === 'generating')

  // Put a conversation in the sidebar (signed-in users only; Guest keeps just the open one).
  const listConversation = (id: string, title: string) => {
    if (isGuest) return
    setConversations((current) =>
      current.some((conversation) => conversation.id === id)
        ? current
        : [{ id, title, group: 'Today' }, ...current],
    )
  }

  // Title a conversation after what was said first, like a typed first message does.
  const nameConversationFromVoice = (id: string, list: readonly ChatMessageData[]) => {
    if (isGuest) return
    const first = list.find((message) => message.role === 'user' && message.status === 'done')
    const text = first ? blocksToText(first.blocks).trim() : ''
    if (!text) return
    const title = text.length > 40 ? `${text.slice(0, 40).trimEnd()}…` : text
    setConversations((current) =>
      current.map((conversation) => (conversation.id === id && conversation.title === NEW_CHAT_TITLE ? { ...conversation, title } : conversation)),
    )
  }

  const handleTranscript = (event: TranscriptEvent) => {
    const chatId = voiceChatId.current
    if (!chatId) return
    nextId.current += 1
    const result = applyTranscriptEvent(messagesRef.current[chatId] ?? [], voiceCursor.current, event, () => `m-voice-${nextId.current}`, formatTime(new Date()))
    voiceCursor.current = result.cursor
    updateMessages((current) => ({ ...current, [chatId]: result.messages }))
    if (event.type === 'turn-complete' || event.type === 'close') nameConversationFromVoice(chatId, result.messages)
    if (event.type === 'close') voiceChatId.current = null
  }
  const voice = useVoiceConversation(handleTranscript)
  // Live is its own page (/live). `liveFrom` is how many messages the conversation had when it started;
  // only what is said after that is shown there, while everything is kept in the conversation.
  const [liveFrom, setLiveFrom] = useState(0)
  const endVoice = voice.end
  const dismissVoice = voice.dismiss
  // Leaving Live always ends the session and releases the microphone.
  const closeLive = useCallback(() => {
    endVoice()
    dismissVoice()
  }, [endVoice, dismissVoice])

  const abortAllRequests = () => {
    requests.current.forEach((controller) => controller.abort())
    requests.current.clear()
  }

  // Leaving the page (or switching identity, which remounts this component) cancels pending requests.
  useEffect(() => {
    const pending = requests.current
    return () => {
      pending.forEach((controller) => controller.abort())
      pending.clear()
    }
  }, [])

  // A session only lives while the Live page is open: going back, to Settings, or anywhere else ends it.
  useEffect(() => {
    if (!isLive) closeLive()
  }, [isLive, closeLive])

  useEffect(() => {
    if (!sidebarOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sidebarOpen])

  const selectConversation = (id: string) => {
    // A voice session belongs to one conversation; switching away ends it.
    if (id !== activeId) closeLive()
    setActiveId(id)
    setSidebarOpen(false)
    onNavigate('/chat')
  }

  const startNewChat = () => {
    closeLive()
    nextId.current += 1
    const id = `chat-new-${nextId.current}`
    if (isGuest) {
      // Guest keeps only the currently open conversation in memory. Starting
      // another chat discards the previous messages rather than adding history,
      // so a reply still being fetched for them is cancelled too.
      abortAllRequests()
      setConversations([])
      updateMessages(() => ({}))
    } else {
      setConversations((current) => [{ id, title: NEW_CHAT_TITLE, group: 'Today' }, ...current])
    }
    setActiveId(id)
    setSidebarOpen(false)
    onNavigate('/chat')
  }

  const sendMessage = (text: string) => {
    // One request per conversation at a time (the composer shows Stop meanwhile),
    // and a Live session is a separate screen, so typing never overlaps with it.
    if (isGenerating || voice.busy) return

    nextId.current += 1
    const conversationId = activeId
    const replyId = `m-reply-${nextId.current}`
    const message: ChatMessageData = {
      id: `m-local-${nextId.current}`,
      role: 'user',
      sentAt: formatTime(new Date()),
      blocks: [{ type: 'paragraph', text }],
    }
    // Empty assistant message in the `generating` state: the existing loading UI.
    const pendingReply: ChatMessageData = { id: replyId, role: 'assistant', status: 'generating', blocks: [] }
    const payload = toApiMessages(messages, text)
    updateMessages((current) => ({
      ...current,
      [conversationId]: [...(current[conversationId] ?? []), message, pendingReply],
    }))

    const controller = new AbortController()
    requests.current.set(conversationId, controller)
    const finish = (result: Pick<ChatMessageData, 'status' | 'blocks'>) =>
      updateMessages((current) => {
        const list = current[conversationId]
        // Ignore the result if the conversation was discarded or the request was stopped.
        if (!list?.some((item) => item.id === replyId && item.status === 'generating')) return current
        return { ...current, [conversationId]: list.map((item) => (item.id === replyId ? { ...item, ...result } : item)) }
      })
    sendChatMessages(payload, controller.signal)
      .then(
        ({ reply }) => finish({ status: 'done', blocks: replyToBlocks(reply) }),
        (error: unknown) => {
          if (controller.signal.aborted) return
          finish({ status: 'error', blocks: [{ type: 'paragraph', text: describeChatError(error) }] })
        },
      )
      .finally(() => {
        if (requests.current.get(conversationId) === controller) requests.current.delete(conversationId)
      })
    if (!isGuest) {
      const title = text.length > 40 ? `${text.slice(0, 40).trimEnd()}…` : text
      setConversations((current) => current.some(conversation => conversation.id === activeId)
        ? current.map(conversation => conversation.id === activeId && conversation.title === NEW_CHAT_TITLE ? { ...conversation, title } : conversation)
        : [{ id: activeId, title, group: 'Today' }, ...current],
      )
    }
  }

  // Cancel the open conversation's request and drop its empty reply. The user's
  // message stays, unanswered, and is not sent again as history.
  const stopGenerating = () => {
    requests.current.get(activeId)?.abort()
    requests.current.delete(activeId)
    updateMessages((current) => ({
      ...current,
      [activeId]: (current[activeId] ?? []).filter((message) => message.status !== 'generating'),
    }))
  }

  // (Re)start the Live session of the open conversation. Earlier completed exchanges are its context.
  const beginLiveSession = () => {
    if (isGenerating || voice.busy) return
    voiceChatId.current = activeId
    voiceCursor.current = emptyCursor
    voice.start(toHistoryTurns(messagesRef.current[activeId] ?? []))
  }

  // Start Live from where Live was opened: the open conversation is its context and where it is saved.
  const startLiveSession = () => {
    if (isGenerating || voice.busy) return
    listConversation(activeId, NEW_CHAT_TITLE)
    setLiveFrom((messagesRef.current[activeId] ?? []).length)
    beginLiveSession()
  }

  // The header button: open the Live page and start (the click is the user's permission to use the microphone).
  const openLive = () => {
    if (isGenerating || voice.busy) return
    onNavigate('/live')
    startLiveSession()
  }

  // End live / Back to chat: close the session, then return to the conversation it came from.
  const leaveLive = () => {
    closeLive()
    onNavigate('/chat')
  }

  const openSettings = () => {
    setSidebarOpen(false)
    onNavigate('/settings')
  }
  // The three-dot menus remain placeholders until their own implementation.
  const openItemMenu = (id: string) => {
    void id
  }

  return (
    // Match Chat's desktop rem sizing on Settings, using a Tailwind ancestor
    // variant so the existing global CSS and Chat appearance stay unchanged.
    <div className={`${isSettings ? 'settings-root desk:[html:has(&)]:text-[clamp(12px,min(calc(100vw/96),calc(100vh/64)),16px)]!' : 'chat-root'} flex h-dvh overflow-hidden bg-canvas text-ink`}>
      <div className={isLive ? 'hidden' : 'contents'}>
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
      </div>
      {sidebarOpen && (
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 desk:hidden"
        />
      )}

      <main className={`${isSettings || isLive ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col`}>
        <ChatHeader
          title={activeConversation?.title ?? NEW_CHAT_TITLE}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          onStartLive={openLive}
          liveDisabled={isGenerating}
        />
        <MessageList conversationId={activeId} messages={messages} />
        <ChatComposer
          key={isGuest ? activeId : undefined}
          isGenerating={isGenerating}
          dictationEnabled={!isLive && !isSettings}
          resetKey={`${activeId}|${isSettings}|${isLive}`}
          onSend={sendMessage}
          onStop={stopGenerating}
        />
      </main>
      {isLive && (
        <LiveScreen
          state={voice.state}
          messages={messages.slice(liveFrom)}
          getLevels={voice.getLevels}
          onMute={voice.mute}
          onUnmute={voice.unmute}
          onStart={startLiveSession}
          onExit={leaveLive}
        />
      )}
      {isSettings && (
        <SettingsPage
          user={user}
          isGuest={isGuest}
          theme={theme}
          onThemeChange={onThemeChange}
          onLogout={onLogout ? () => { closeLive(); onLogout() } : undefined}
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
