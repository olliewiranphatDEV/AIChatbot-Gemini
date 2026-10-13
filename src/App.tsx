import { useSyncExternalStore } from 'react'
import ChatPage from './pages/chat/ChatPage.tsx'
import SignInPage from './pages/signin/SignInPage.tsx'

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

function navigate(nextPath: '/chat' | '/settings') {
  if (currentPath() === nextPath) return
  window.history.pushState(null, '', nextPath)
  window.dispatchEvent(new Event('app:navigation'))
}

export default function App() {
  const path = useSyncExternalStore(subscribeToLocation, currentPath)
  if (path !== '/chat' && path !== '/settings') return <SignInPage />

  // Keep the workspace mounted between routes so the conversation, draft,
  // history, and scroll position survive a visit to Settings.
  return <ChatPage activePage={path === '/settings' ? 'settings' : 'chat'} onNavigate={navigate} />
}
