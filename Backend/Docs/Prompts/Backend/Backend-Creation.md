Implement the backend foundation for my AIChatbot-Gemini project inside the existing `Backend` folder.

Current confirmed progress:
- All three frontend screens are complete: Sign-in, Chat, and Settings.
- Google Account sign-in through Firebase Authentication works and opens the Chat page.
- The workspace contains separate `Frontend` and `Backend` folders.

Selected stack and deployment:
- Backend: Node.js + Express + TypeScript.
- Future AI integration: Gemini Developer API.
- Future database: Firebase Cloud Firestore.
- Backend deployment target: Render.
- Frontend deployment target: Firebase Hosting.

Complete the implementation, install dependencies, and run appropriate checks. Follow these requirements:

1. Inspect the existing workspace first.

Read applicable project instructions, inspect the contents of both folders, and check installed Node.js/npm versions. Preserve existing files and Git boundaries. Use compatible, maintained package versions and a supported Node.js LTS runtime.

Keep the exact folder capitalization: `Backend` and `Frontend`.

2. Create an independent backend project.

Put backend source code, dependencies, package.json, package-lock.json, TypeScript configuration, environment configuration, and documentation inside `Backend`.

Keep the structure simple. Separate Express application setup from the server entry point, and provide a small configuration module and health route. Avoid unnecessary architectural layers, workspaces, or monorepo tooling.

Use TypeScript strict mode with consistent module settings that work in development and in compiled JavaScript.

3. Provide working development and production commands.

Include these npm scripts:
- `dev`: run the TypeScript server with automatic restart during development.
- `typecheck`: check types without emitting files.
- `build`: compile the backend into `dist`.
- `start`: run the compiled JavaScript with Node.js.

Production startup must work independently of the TypeScript development runner.

4. Configure the HTTP server.

Use `PORT` from the environment, with `3001` as the local default. Validate the port and bind to `0.0.0.0` for future Render compatibility.

Load local environment variables before reading configuration. Support environment variables supplied directly by the deployment platform.

Add JSON request parsing with a reasonable body-size limit, JSON responses for unknown API routes, and centralized error handling. Avoid exposing stack traces in production responses.

5. Add a health endpoint.

Implement `GET /api/health` returning HTTP 200 with:
`{"status":"ok","service":"aichatbot-gemini-backend"}`

The server must start and this endpoint must work without Gemini credentials, Firebase Admin credentials, or a database connection.

6. Configure CORS through environment variables.

Inspect the actual frontend development configuration and allow its origin. The current observed frontend URL is `http://localhost:5173`.

Use an explicit origin allowlist that can later include the Firebase Hosting frontend URL. Do not use an unrestricted wildcard. Handle preflight requests appropriately.

7. Prepare minimal frontend connectivity.

Inside `Frontend`, add or reuse a small typed API helper that reads `VITE_API_BASE_URL` and can request the backend health endpoint.

Document `VITE_API_BASE_URL=http://localhost:3001` in the frontend environment example. Preserve all existing Firebase environment values and follow the project's existing API/configuration conventions.

Preserve the existing screen designs, responsive behavior, routes, Google sign-in, and Guest flow. Do not add a visible health-check widget or a permanent startup health request solely for this test.

8. Provide environment examples.

Create `Backend/.env.example` with the non-secret values needed for this milestone, including the port and CORS allowlist.

Ensure local environment files, node_modules, and build output are ignored appropriately within the existing Git structure. Never copy frontend Firebase configuration or secrets into the backend unnecessarily.

9. Keep this milestone focused.

Implement backend setup and connectivity only. Gemini integration, Firebase Admin token verification, Firestore persistence, chat endpoints, streaming, and deployment belong to later milestones.

Do not add fake AI replies or modify the existing mock chat behavior.

10. Write a practical Backend README.

Explain:
- The folder structure and environment variables.
- How to install, develop, type-check, build, and start.
- How to run Frontend and Backend in separate terminals.
- How to call `/api/health`.
- How to verify browser-to-backend connectivity from the running frontend.
- The intended future Render build/start commands, without deploying anything.

Provide copyable Bash commands suitable for Windows Git Bash, using `npm.cmd` where appropriate.

11. Verify the implementation.

Run backend type-checking and compilation. Start the compiled server and verify the health endpoint and an unknown API route.

Check CORS response headers for the configured frontend origin. If browser tooling is available, verify an actual browser fetch from the frontend origin; otherwise provide the exact manual browser test and label it unverified.

Run the existing frontend build after frontend changes. Fix any problems introduced by this work.

Finish with a concise summary of changed files, commands to run both projects, and verification results. Clearly distinguish checks that passed from checks that could not be performed.

Do not commit, push, or deploy.