/** Guest access is temporary and keeps all conversation state in memory. */
export type WorkspaceSession = { kind: 'guest'; id: string }
export type AuthSession = { kind: 'signed-out' } | WorkspaceSession
