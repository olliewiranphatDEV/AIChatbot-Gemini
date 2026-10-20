import { typography } from './styles/typography.ts'
import { useEffect, useSyncExternalStore } from 'react'
import ChatPage from './pages/chat/ChatPage.tsx'
import SignInPage from './pages/signin/SignInPage.tsx'
import BrandLogo from './components/shared/BrandLogo.tsx'
import useAuthSession from './auth/useAuthSession.ts'
import { useThemePreference } from './theme/useThemePreference.ts'

function currentPath() {
  return window.location.pathname.replace(/\/+$/, '') || '/'
}

function subscribeToLocation(listener: () => void) {
  window.addEventListener('popstate', listener)
  window.addEventListener('app:navigation', listener)
  return () => {
    window.removeEventListener('popstate', listener)
    window.removeEventListener('app:navigation', listener)
  }
}

function navigate(nextPath: '/chat' | '/settings' | '/live' | '/login', replace = false) {
  if (currentPath() === nextPath) return
  if (replace) window.history.replaceState(null, '', nextPath)
  else window.history.pushState(null, '', nextPath)
  window.dispatchEvent(new Event('app:navigation'))
}

export default function App() {
  const path = useSyncExternalStore(subscribeToLocation, currentPath)
  const auth = useAuthSession()
  // The theme belongs to the device, not the account, so it is the same on every page and across sign-in and sign-out.
  const { preference: theme, choose: chooseTheme } = useThemePreference()

  const isWorkspace = path === '/chat' || path === '/settings' || path === '/live'
  const signedIn = auth.session.kind !== 'signed-out'

  useEffect(() => {
    if (auth.initializing) return
    if (signedIn && !isWorkspace) navigate('/chat', true)
    if (!signedIn && isWorkspace) navigate('/login', true)
  }, [auth.initializing, signedIn, isWorkspace])

  if (auth.initializing) {
    return <main className="flex min-h-dvh items-center justify-center bg-canvas" aria-busy="true"><div role="status" className={`${typography.description} flex items-center gap-3 text-brand-alt`}><BrandLogo className="size-8" /><span>Loading your session...</span></div></main>
  }

  if (auth.session.kind === 'signed-out') {
    return <SignInPage onGoogleSignIn={() => { void auth.continueWithGoogle() }} onGuest={auth.continueAsGuest} busy={auth.busy} error={auth.error} />
  }

  // Both routes share the same mounted workspace, preserving messages, the
  // active conversation, the composer draft, and chat scroll position. Changing
  // identity or exiting a session unmounts it, clearing the previous chat data.
  return <ChatPage
    key={auth.session.kind === 'google' ? auth.session.user.uid : auth.session.id}
    session={auth.session}
    theme={theme}
    onThemeChange={chooseTheme}
    activePage={path === '/settings' ? 'settings' : path === '/live' ? 'live' : 'chat'}
    onNavigate={navigate}
    onLogout={() => { void auth.logout() }}
    loggingOut={auth.busy}
    logoutError={auth.error}
  />
}
