import { useState } from 'react'
import type { AuthSession } from '../types/auth.ts'

export default function useAuthSession() {
  const [session, setSession] = useState<AuthSession>({ kind: 'signed-out' })
  const [error, setError] = useState<string | null>(null)

  const continueAsGuest = () => {
    setError(null)
    // No account, storage entry, or chat history is created.
    setSession({ kind: 'guest', id: crypto.randomUUID() })
  }
  const logout = () => {
    setError(null)
    setSession({ kind: 'signed-out' })
  }
  // Google authentication is wired separately; never fabricate a login.
  const continueWithGoogle = () => {
    setError('Google sign-in is currently unavailable. Continue as Guest to try AI Chat.')
  }
  return { session, error, continueAsGuest, continueWithGoogle, logout }
}
