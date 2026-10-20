import { createServer } from 'vite'

const useEmulator = process.argv.includes('--emulator')
// Test processes never consume the developer's real Firebase configuration.
Object.assign(process.env, {
  VITE_FIREBASE_API_KEY: useEmulator ? 'demo-api-key' : '',
  VITE_FIREBASE_AUTH_DOMAIN: useEmulator ? 'demo-ai-chatbot.firebaseapp.com' : '',
  VITE_FIREBASE_PROJECT_ID: useEmulator ? 'demo-ai-chatbot' : '',
  VITE_FIREBASE_APP_ID: useEmulator ? 'demo-app-id' : '',
  VITE_FIREBASE_AUTH_EMULATOR_URL: useEmulator ? 'http://127.0.0.1:9099' : '',
})
const server = await createServer({
  mode: 'test',
  server: { open: false, host: '127.0.0.1', port: useEmulator ? 5181 : 5180, strictPort: true },
})
await server.listen()
server.printUrls()
