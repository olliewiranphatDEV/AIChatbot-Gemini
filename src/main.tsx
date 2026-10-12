import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ChatPage from './pages/chat/ChatPage.tsx'
import SignInPage from './pages/signin/SignInPage.tsx'

// Minimal path switch (no router yet): `/chat` shows the chat page, while `/`
// and `/login` (the dev/preview server falls back to index.html for any path)
// show the sign-in page.
const path = window.location.pathname.replace(/\/+$/, '') || '/'
const Page = path === '/chat' ? ChatPage : SignInPage

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
