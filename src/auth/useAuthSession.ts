import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { authErrorMessage, getAuthClient, googleSession, isGoogleConfigured, signInWithGoogle, signOutGoogle } from './firebase.ts'
import type { AuthSession } from '../types/auth.ts'

export default function useAuthSession() {
  const [session, setSession] = useState<AuthSession>({ kind: 'signed-out' })
  const [initializing, setInitializing] = useState(isGoogleConfigured)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const operationPending = useRef(false)

  useEffect(() => {
    let active = true
    try {
      const auth = getAuthClient()
      if (!auth) return
      return onAuthStateChanged(auth, user => {
        setSession(current => user ? googleSession(user) : current.kind === 'guest' ? current : { kind: 'signed-out' })
        setInitializing(false)
      }, failure => {
        setError(authErrorMessage(failure))
        setInitializing(false)
      })
    } catch (failure) {
      // Report initialization failures asynchronously like the auth observer,
      // and ignore notifications after the subscription is disposed.
      queueMicrotask(() => {
        if (!active) return
        setError(authErrorMessage(failure))
        setInitializing(false)
      })
      return () => { active = false }
    }
  }, [])

  const continueWithGoogle = async () => {
    if (operationPending.current || initializing) return
    operationPending.current = true
    setBusy(true)
    setError(null)
    try {
      const result = await signInWithGoogle()
      setSession(googleSession(result.user))
    } catch (failure) {
      setError(authErrorMessage(failure))
    } finally {
      operationPending.current = false
      setBusy(false)
    }
  }

  const continueAsGuest = () => {
    if (operationPending.current || initializing) return
    setError(null)
    // No anonymous Firebase account, storage entry, or chat history is created.
    setSession({ kind: 'guest', id: `guest-${Date.now()}-${Math.random().toString(36).slice(2)}` })
  }

  const logout = async () => {
    if (operationPending.current) return
    operationPending.current = true
    setBusy(true)
    setError(null)
    try {
      if (session.kind === 'google') await signOutGoogle()
      setSession({ kind: 'signed-out' })
    } catch {
      setError('Could not log out. Please try again.')
    } finally {
      operationPending.current = false
      setBusy(false)
    }
  }

  return { session, initializing, busy, error, continueWithGoogle, continueAsGuest, logout }
}
