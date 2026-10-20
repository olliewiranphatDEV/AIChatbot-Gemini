export type MessageBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

export type ChatMessageData = {
  id: string
  role: 'user' | 'assistant'
  /** Time label such as "2:14 PM". Shown under user messages. */
  sentAt?: string
  blocks: MessageBlock[]
  /** How the message was produced. Messages without a source were typed. */
  source?: 'text' | 'voice'
  /**
   * `generating` is a text request in flight (shows the cursor and status line);
   * `error` holds the failure text instead of a reply. Voice turns use
   * `streaming` while the transcript is still arriving and `interrupted` when the
   * turn was cut off (barge-in, session ended): its text stays on screen but is
   * never treated as a completed message or sent back to the model as history.
   */
  status?: 'done' | 'generating' | 'error' | 'streaming' | 'interrupted'
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
