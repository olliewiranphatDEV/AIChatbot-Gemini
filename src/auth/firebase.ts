import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import type { Auth, User } from 'firebase/auth'
import type { WorkspaceSession } from '../types/auth.ts'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
}

export const isGoogleConfigured = Object.values(config).every(Boolean)
let client: Auth | undefined

export function getAuthClient(): Auth | null {
  if (!isGoogleConfigured) return null
  if (client) return client

  const app = getApps().length ? getApp() : initializeApp(config)
  const auth = getAuth(app)

  // The emulator is an explicit, local, development-only opt-in. Production
  // builds always use real Firebase Authentication.
  const emulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL?.trim()
  if (import.meta.env.DEV && emulatorUrl) {
    const url = new URL(emulatorUrl)
    if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname)) {
      throw new Error('The authentication emulator must run on localhost over HTTP.')
    }
    connectAuthEmulator(auth, url.origin)
  }
  client = auth
  return client
}

export function googleSession(user: User): WorkspaceSession {
  return {
    kind: 'google',
    user: { uid: user.uid, name: user.displayName || user.email?.split('@')[0] || 'Google user', email: user.email ?? undefined },
  }
}

export function signInWithGoogle() {
  const auth = getAuthClient()
  if (!auth) throw new Error('google-not-configured')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  // Invoke directly from the button click to retain the browser's user gesture.
  return signInWithPopup(auth, provider)
}

export async function signOutGoogle() {
  const auth = getAuthClient()
  if (!auth) throw new Error('google-not-configured')
  await signOut(auth)
}

export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
  switch (code) {
    case 'auth/popup-closed-by-user': return 'Sign-in was canceled. Try again or continue as Guest.'
    case 'auth/cancelled-popup-request': return 'A sign-in window is already open. Complete that window first.'
    case 'auth/popup-blocked': return 'Allow pop-ups for this site, then try signing in again.'
    case 'auth/network-request-failed': return 'Check your connection and try again.'
    case 'auth/account-exists-with-different-credential': return 'This email uses another sign-in method. Please use that method.'
    case 'auth/user-disabled': return 'This account cannot sign in. Please contact support.'
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.'
    default: return 'Google sign-in is currently unavailable. Please try again or continue as Guest.'
  }
}
