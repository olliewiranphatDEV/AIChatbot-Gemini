import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// VS Code's integrated terminal sets BROWSER so links open in its own browser
// tab; force Chrome so `npm run dev` opens the system Chrome instead.
process.env.BROWSER = 'chrome'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    open: true,
  },
})
