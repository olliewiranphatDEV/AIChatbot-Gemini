import { useEffect, useRef } from 'react'
import type { ChatMessageData } from '../../types/chat.ts'
import ChatMessage from './ChatMessage.tsx'

type MessageListProps = {
  /** Changes when the active conversation changes, to jump to its latest message. */
  conversationId: string
  messages: readonly ChatMessageData[]
}

export default function MessageList({ conversationId, messages }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conversationId, messages.length])

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div
        role="log"
        aria-label="Conversation"
        className="mx-auto flex w-full max-w-[72rem] flex-col gap-[1.5rem] px-[0.75rem] pt-[1.25rem] pb-[1rem] sm:px-[1.5rem] lg:pt-[2.0625rem] lg:pb-[0.5rem] lg:pr-[1.9375rem] lg:pl-[1.8125rem]"
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>
    </div>
  )
}
