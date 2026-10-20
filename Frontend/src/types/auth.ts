import type { ChatUser } from './chat.ts'

export type WorkspaceSession =
  | { kind: 'guest'; id: string }
  | { kind: 'google'; user: ChatUser & { uid: string } }

export type AuthSession = { kind: 'signed-out' } | WorkspaceSession
