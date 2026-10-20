import type { ChatMessageData, ChatUser, Conversation, ConversationGroup } from '../types/chat.ts'

// Static data for the chat UI. Replace with real data once the backend exists.

export const mockUser: ChatUser = { name: 'Ollie', email: 'ollie@example.com' }

export const conversationGroups: readonly ConversationGroup[] = ['Today', 'Yesterday']

export const mockConversations: Conversation[] = [
  { id: 'chat-1', title: 'From idea to first version', group: 'Today' },
  { id: 'chat-2', title: 'Writing a clearer message', group: 'Today' },
  { id: 'chat-3', title: 'Learning something new', group: 'Yesterday' },
  { id: 'chat-4', title: 'Weekend ideas', group: 'Yesterday' },
]

export const initialActiveConversationId = 'chat-1'

export const mockMessages: Record<string, ChatMessageData[]> = {
  'chat-1': [
    {
      id: 'm-1',
      role: 'user',
      sentAt: '2:14 PM',
      blocks: [
        {
          type: 'paragraph',
          text: 'I have an app idea. How can I turn it into a small first version?',
        },
      ],
    },
    {
      id: 'm-2',
      role: 'assistant',
      status: 'done',
      blocks: [
        {
          type: 'paragraph',
          text: 'Start with one clear problem and the smallest useful solution.',
        },
        {
          type: 'list',
          items: [
            'Define the user and their main goal.',
            'Choose one essential action.',
            'Build a simple flow and test it.',
          ],
        },
        {
          type: 'paragraph',
          text: 'What should someone be able to do in your first version?',
        },
      ],
    },
    {
      id: 'm-3',
      role: 'user',
      sentAt: '2:16 PM',
      blocks: [{ type: 'paragraph', text: 'Let’s map the pages first.' }],
    },
    {
      id: 'm-4',
      role: 'assistant',
      status: 'generating',
      blocks: [
        { type: 'paragraph', text: 'Absolutely. We can start with three core screens' },
      ],
    },
  ],
}
