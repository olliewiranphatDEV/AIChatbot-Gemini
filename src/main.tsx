import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SignInPage from './pages/SignInPage.tsx'

// Both `/` and `/login` serve the sign-in page (the dev/preview server falls
// back to index.html for any path), so no router is needed for this iteration.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SignInPage />
  </StrictMode>,
)
