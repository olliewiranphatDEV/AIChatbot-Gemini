export type MessageBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

export type ChatMessageData = {
  id: string
  role: 'user' | 'assistant'
  /** Time label such as "2:14 PM". Shown under user messages. */
  sentAt?: string
  blocks: MessageBlock[]
  /** `generating` shows the streaming cursor and status line. */
  status?: 'done' | 'generating'
}

export type ConversationGroup = 'Today' | 'Yesterday'

export type Conversation = {
  id: string
  title: string
  group: ConversationGroup
}

export type ChatUser = {
  name: string
  email?: string
}
