import { createServer } from 'vite'

const server = await createServer({
  mode: 'test',
  server: { open: false, host: '127.0.0.1', port: 5180, strictPort: true },
})
await server.listen()
server.printUrls()
