Implement text chat and real-time voice conversation in the existing AIChatbot-Gemini project.

Work in the existing `Frontend/` and `Backend/` folders. Read the applicable project instructions and inspect the current implementation first. Continue through implementation and verification; do not stop after proposing a plan.

## 1. Current project and scope

- Frontend: React, TypeScript, Vite, Tailwind CSS.
- Sign-in, Chat, and Settings screens are implemented and responsive.
- Firebase Google sign-in works. Preserve the existing Google and Guest flows.
- Backend: Node.js, Express, TypeScript, with `@google/genai` already installed.
- Text chat already calls `POST /api/chat`, using `{ messages }` → `{ reply }`.
- Backend configuration is loaded from `Backend/.env.local`.
- Frontend configuration is loaded from `Frontend/.env.local`.
- Text chat currently uses Gemini 3.8 Flash and has encountered upstream HTTP 429 errors.
- Firestore persistence is not implemented.

Implement these two modes:

| User action | Model | Result |
|---|---|---|
| Type a message and press Send | `gemini-3.5-flash-lite` | Text response |
| Press the microphone button | `gemini-3.8-live` | Real-time spoken conversation |

Do not deploy, enable billing, commit, or push. Do not add Firestore or create another repository.

## 2. Preserve the existing UI

Keep the existing colors, typography, spacing, message cards, navigation, and responsive behavior.

Reuse the existing microphone control if present. Add only the controls and status indicators needed for voice conversation, using the existing design language.

Verify desktop, tablet, and mobile layouts. Avoid overflow, overlapping controls, and changes to the existing Sign-in and Settings designs.

Users should choose the interaction by typing or pressing the microphone. Do not add a model-selection dropdown.

## 3. Text chat

Use `gemini-3.5-flash-lite` as the default text model, configurable through `GEMINI_MODEL`.

Preserve:

- The existing `/api/chat` contract.
- Conversation history and correct user/assistant role mapping.
- Loading, cancellation, and error behavior.
- Protection against duplicate submissions.
- Correct association of replies with their original conversation.
- Exclusion of failed or cancelled turns from future model context.
- Existing plain-text rendering unless a change is necessary for this task.

Do not assume switching models fixes the existing 429 issue. Verify a real request with Flash-Lite separately.

## 4. Real-time voice conversation

Use `gemini-3.8-live`, configurable through `GEMINI_LIVE_MODEL`.

This must be an actual Gemini Live API conversation: the user speaks and Gemini responds with streamed audio. Do not substitute browser speech recognition followed by the text endpoint, browser text-to-speech, or mock responses.

Before implementing, consult current official Google documentation and the installed SDK typings for:

- Gemini 3.8 Live setup and supported configuration.
- Ephemeral authentication tokens.
- Microphone audio streaming and audio playback.
- Input/output transcription.
- Interruption handling.
- Session management.

Use the correct model ID and API methods. Do not copy incompatible settings from older Live models or silently fall back to another model.

Preferred connection:

1. Frontend requests a short-lived Live token from Backend.
2. Backend creates the token using the server-side Gemini API key.
3. Frontend connects directly to Gemini Live using that token.

Keep the permanent API key exclusively on Backend. Never expose it through Vite variables, frontend code, responses, logs, or documentation.

Constrain ephemeral tokens to the intended model and session configuration using supported API options. Use short expiration and single-use tokens. Responses containing tokens must not be cached.

Add bounded request throttling for the new token endpoint, and prevent the UI from creating duplicate active voice sessions. Preserve current Google and Guest access behavior; do not silently require a new login method.

Document that these controls do not replace authentication and a Guest abuse policy before public deployment.

## 5. Voice interaction and lifecycle

Implement clear states such as connecting, listening, AI speaking, muted, ended, and error.

Required behavior:

- Request microphone permission only after the user presses the microphone button.
- Handle permission denial and unavailable microphones clearly.
- Provide microphone mute/unmute and an End conversation control.
- While muted, stop transmitting microphone audio.
- Support speaking over the AI: stop queued playback appropriately when Gemini reports interruption.
- Prevent simultaneous text submission and active voice interaction from creating conflicting turns; make the active mode clear.
- End the voice session when leaving Chat, signing out, starting a new chat, or switching to another conversation.
- Release microphone tracks, audio resources, sockets, listeners, and pending callbacks on cleanup.
- Prevent stale responses or transcripts from appearing in another conversation.
- Handle disconnects, quota errors, and token expiration without infinite retry or reconnect loops.

Use the documented audio formats, including resampling where necessary. Do not assume MediaRecorder's default output is directly compatible with Gemini.

Implement documented context compression/session resumption where needed for continuity. Do not promise unlimited sessions. If a session cannot continue, preserve completed conversation text and show a clear way to reconnect.

## 6. Shared conversation context

Show user and AI voice transcripts in the existing conversation.

- Use Gemini's supported input and output transcription.
- Update partial transcripts in place rather than adding duplicate message bubbles.
- Store completed voice turns in the existing in-memory conversation state.
- Send relevant completed text history when starting voice conversation.
- Include completed voice transcripts in subsequent text-chat context.
- Do not resend the latest user message twice.
- Do not treat incomplete, failed, or interrupted output as a completed assistant response.
- Keep partial output visibly distinguishable if retained.

Test switching from text to voice and back within one conversation. Clearly report any context limitation that remains.

## 7. Configuration and diagnostics

Use separate configuration values:

- `GEMINI_MODEL=gemini-3.5-flash-lite`
- `GEMINI_LIVE_MODEL=gemini-3.8-live`

Update configuration validation, `Backend/.env.example`, and README.

Do not print secrets or modify my real `.env.local` files. At completion, tell me the exact non-secret lines I must add or replace. Remember that an existing environment value overrides a new default.

Log configured model names safely so I can confirm which model each mode uses.

For upstream failures, preserve useful diagnostic fields through an explicit allowlist where available: status, provider error code, quota metric/limit, and retry delay. Do not log complete SDK error objects, authentication headers, tokens, API keys, audio, or conversation content.

Keep frontend errors safe and understandable. Do not describe every 429 as confirmed daily quota exhaustion. Respect retry guidance and avoid aggressive retries.

## 8. Verification

Run the existing relevant checks and add meaningful tests for the new behavior:

- Backend typecheck, build, and tests.
- Frontend build, lint, and relevant existing tests.
- Token endpoint constraints, throttling, and safe error handling.
- Voice state transitions and cleanup.
- Transcript deduplication and conversation isolation.
- Regression coverage for text cancellation and history handling.

Perform a small number of real API checks using runtime-loaded credentials, without displaying them:

- Flash-Lite returns a real text reply.
- Live token creation and connection work.
- Audio input produces a real audio response if the environment supports that test.

Verify actual browser microphone capture and playback if available. If hardware access or browser automation prevents this, explicitly mark those checks as unverified and provide a short manual test procedure. Do not count mocked audio tests as a successful real microphone test.

Document that microphone access requires a secure context: localhost is suitable for local development, while a phone opening an ordinary HTTP LAN address may be blocked.

## 9. Completion report

Summarize:

1. What changed and which files changed.
2. Actual model IDs used.
3. Exact environment lines I need to add or replace.
4. Commands to run Backend and Frontend.
5. Checks passed, separating mocked tests from real API/browser checks.
6. Remaining limitations and unverified behavior.
7. A short manual test covering Thai text, Thai voice, interruption, text/voice context, and session cleanup.

Do not claim billing, deployment, Firestore persistence, or public-production readiness.