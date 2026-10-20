Implement the Gemini API integration for my existing AIChatbot-Gemini application.

Complete the implementation and verify that sending a message from the existing Chat screen produces a real Gemini response through the backend.

Current project state:
- `Frontend`: React + TypeScript + Vite + Tailwind CSS.
- Sign-in, Chat, and Settings screens are complete and responsive.
- Firebase Google sign-in works. An existing Guest flow also exists.
- `Backend`: Node.js + Express + TypeScript.
- Backend foundation, health endpoint, CORS, error handling, and frontend API helper are implemented and tested.
- `@google/genai` is already installed in Backend. Inspect the installed version and use its supported API.
- Backend local configuration uses `Backend/.env.local`. Keep this exact filename.
- `GEMINI_API_KEY` has already been added to that file.
- Frontend uses `VITE_API_BASE_URL=http://localhost:3001`.

1. Inspect the existing implementation.

Read applicable project instructions and inspect the backend configuration, middleware, API helper, Chat screen, message types, and existing mock-response flow.

Extend the current structure and conventions. Preserve unrelated changes and existing Git boundaries.

2. Configure Gemini on the backend.

Use the official `@google/genai` SDK and Gemini Developer API.

Load `GEMINI_API_KEY` from the existing backend configuration after `.env.local` has been loaded. Also support environment variables supplied by Render, preserving their precedence over local file values.

Keep the key entirely on the backend. Do not print it, return it in API responses, place it in frontend code, or copy it into documentation.

The additional variables `GEMINI_API_NAME`, `GEMINI_API_PROJECT_NAME`, and `GEMINI_API_PROJECT_NUMBER` are metadata and must not become required connection settings.

3. Verify the model before implementation.

Check current official documentation for model availability, deprecations, and free-tier pricing.

The earlier project choice was `gemini-2.5-flash`, but current documentation restricts 2.5 access to existing users. Select a currently supported Flash text model with free-tier availability for this new integration. Check `gemini-3.5-flash` as a candidate rather than assuming it is accessible to this API key.

Make the model configurable through `GEMINI_MODEL`. Document the selected model and the official sources used.

Keep this integration on the free-tier plan. Do not enable billing, upgrade Firebase, or silently fall back to a paid-only model.

4. Implement a chat endpoint.

Add `POST /api/chat` using this contract, adapting existing internal types where necessary:

Request:
`{"messages":[{"role":"user","content":"Hello"}]}`

Success:
`{"reply":"The actual Gemini response"}`

Support previous successful messages from the active conversation in the request so users can continue a conversation within the current browser session.

Validate the request at runtime:
- Messages must be a non-empty array.
- Roles must be `user` or `assistant`.
- Content must be a non-empty string.
- The final message must be from the user.
- Apply reasonable documented input limits within the existing request-body limit.

Translate application roles to the SDK's expected roles correctly. Include the latest user message exactly once.

Keep conversation context isolated per request. Do not create a shared global chat session or mix history between users or conversations.

Use a small Gemini service module, a reasonable request timeout, and bounded output generation. Do not enable tools, search grounding, or other unrelated capabilities.

5. Handle failures clearly.

Reuse the existing JSON error format and centralized error-handling conventions.

Handle missing configuration, invalid requests, upstream authentication failures, quota/rate limits, timeouts, and blocked or empty responses.

Return safe, useful messages without exposing secrets, stack traces, or raw provider error objects. Never substitute a fake successful AI reply.

Keep `/api/health` working independently of Gemini availability. Do not call Gemini automatically on server startup or health checks.

6. Connect the existing Chat screen.

Extend the typed frontend API helper to call `/api/chat` using `VITE_API_BASE_URL`.

Replace the mock assistant-response path for newly sent messages with the real backend request.

Preserve the approved design, theme, spacing, typography, responsive layouts, navigation, Google sign-in, and Guest flow.

Reuse existing loading and error UI. Prevent duplicate submissions while a request is pending. Keep the conversation usable after a failed request.

If the user switches conversations, starts a new chat, or leaves the page during a request, prevent its eventual response from appearing in the wrong conversation.

This milestone uses a complete, non-streaming response. Do not simulate token streaming. If an existing Stop control is used, connect it to request cancellation where practical.

7. Keep the scope focused.

This is local Gemini integration only. Firestore persistence, Firebase Admin token verification, streaming, and deployment remain later milestones.

Preserve current browser-session conversation behavior. Do not introduce database dependencies, new pages, or additional product features.

Document that backend authentication/abuse controls remain work to complete before exposing the Gemini endpoint publicly.

8. Update configuration examples and documentation.

Update `Backend/.env.example` with a blank `GEMINI_API_KEY` and the selected non-secret `GEMINI_MODEL`.

Preserve the real key and existing settings in `Backend/.env.local`. If local write restrictions prevent a necessary change, provide the exact line for me to add instead of bypassing those restrictions.

Update Backend README with:
- Required Gemini variables.
- The selected model.
- How to run both applications.
- Chat endpoint examples.
- How to verify a real reply.
- This milestone's remaining limitations.

9. Verify the result.

Run backend type-check/build and the existing frontend build/lint commands.

Use focused checks for request validation, role/history mapping, and safe upstream-error handling. Avoid an unnecessarily large new test framework.

Use the configured key for a minimal live test, then verify the existing Chat UI in a browser if browser tooling is available. Also check a short follow-up message to confirm conversation context.

Keep live requests few and small; avoid repeated retries on quota or billing-related failures.

Clearly distinguish mocked tests, successful live Gemini calls, and browser verification. Do not report success unless an actual Gemini response was received.

Finish with changed files, the selected model, any environment line I must add, verification results, and commands to run the app.

Do not commit, push, or deploy.

Official references:
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/deprecations
- https://github.com/googleapis/js-genai