# AIChatbot-Gemini — Backend

Node.js + Express + TypeScript API for the AIChatbot-Gemini app.

**Current milestone: local text chat + two voice modes.** The server answers `GET /api/health`,
`POST /api/chat` (typed chat: sends a conversation to the Gemini Developer API and returns
one complete reply), `POST /api/live-token` (issues a short-lived, single-use token so the
browser can talk to the Gemini Live API directly: the **Live** mode) and
`POST /api/transcribe` (turns a recording into text for the user to review: the **Voice** button). Firebase Admin token
verification, Firestore persistence, and deployment are later milestones — see
[Limitations](#limitations-of-this-milestone) before exposing this server publicly.

## Requirements

- Node.js **22.12 or newer** (the repo was checked on Node 22 LTS) and npm.
- A Gemini Developer API key from [Google AI Studio](https://aistudio.google.com/apikey).
- The commands below use `npm.cmd` for Windows Git Bash. On macOS/Linux use `npm`.

## Folder structure

```
Backend/
├── src/
│   ├── server.ts        entry point: load config, listen, shut down on SIGTERM/SIGINT
│   ├── app.ts           createApp(config): CORS, JSON parsing, routes, error handling
│   ├── config.ts        reads and validates PORT / CORS_ALLOWED_ORIGINS / GEMINI_* / NODE_ENV
│   ├── errors.ts        HttpError: errors whose message is safe to show to users
│   ├── gemini.ts        Gemini service: role mapping, request settings, error translation
│   ├── live.ts          Live token service: ephemeral token + the settings locked into it
│   ├── transcribe.ts    WAV check + speech-to-text service (Voice button)
│   ├── upstream.ts      Gemini error -> safe user error; allowlisted failure logging
│   ├── rateLimit.ts     in-memory sliding-window throttle (per client address + global)
│   ├── middleware.ts    JSON 404 for unknown /api routes + central error handler
│   └── routes/
│       ├── health.ts    GET /api/health
│       ├── chat.ts      POST /api/chat: request validation + route
│       ├── live.ts      POST /api/live-token (throttled, never cached)
│       └── transcribe.ts POST /api/transcribe (raw WAV body, throttled)
├── tests/               focused node:test checks (no network, no API key needed)
├── dist/                compiled JavaScript (generated, git-ignored)
├── .env.example         non-secret template (see "Environment variables")
├── .env.local           your local settings and secrets (you create it; git-ignored)
├── .gitignore
├── package.json / package-lock.json
├── tsconfig.json        strict TypeScript, ES modules (NodeNext)
└── README.md
```

## Environment variables

The backend reads local settings from **`Backend/.env.local`** (the same file name the
frontend uses). It does not read a plain `.env`. The file is found relative to the
backend code, so it is loaded no matter which directory you start the server from.
On a hosting platform (Render) set the same names as real environment variables;
variables already set by the platform always win over the file. `.env.local` is
git-ignored — never commit it.

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | for chat and voice | — | Gemini Developer API key. Without it the server still starts, `/api/health` works, and `POST /api/chat`, `POST /api/live-token` and `POST /api/transcribe` answer `503 ai_not_configured`. |
| `GEMINI_MODEL` | no | `gemini-3.5-flash-lite` | Model ID for typed chat replies (see [Models](#gemini-models)). Letters, digits, `.`, `_`, `-` only. |
| `GEMINI_LIVE_MODEL` | no | `gemini-3.8-live` | Model ID for live voice (Gemini Live API). Same character rules. No fallback model is ever used. |
| `TRUST_PROXY_HOPS` | no | `0` | Number of reverse proxies in front of the server (a single digit 0–9). Only affects which client address the voice-token throttle uses; see [Throttling](#throttling-and-abuse-protection). |
| `PORT` | no | `3001` | Port to listen on. Must be an integer 1–65535. The server binds `0.0.0.0`. |
| `CORS_ALLOWED_ORIGINS` | production only | `http://localhost:5173` (development) | Comma-separated browser origins allowed to call the API. Each entry is `scheme://host[:port]` with no path. `*` is rejected. |
| `NODE_ENV` | no | `development` | `production` makes `CORS_ALLOWED_ORIGINS` mandatory. |

`GEMINI_API_NAME`, `GEMINI_API_PROJECT_NAME`, and `GEMINI_API_PROJECT_NUMBER` may stay in
the file as notes; they are metadata, are ignored by the code, and are never required.

Invalid values stop the server at startup with a one-line `Configuration error: ...`.

`Backend/.env.example` is the committed, non-secret template. Create your local file from
it (`cp .env.example .env.local`) and fill in the key. A typical `Backend/.env.local`:

```dotenv
NODE_ENV=development
PORT=3001
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Server-side secret. Never put it in the frontend, a VITE_* variable, or Git.
GEMINI_API_KEY=your-key-here
# Optional; these are the defaults.
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_LIVE_MODEL=gemini-3.8-live
```

**An environment value that already exists wins over a default.** If your
`Backend/.env.local` (or the hosting platform) still says `GEMINI_MODEL=gemini-3.8-flash`
from the previous milestone, the server keeps using that model: change or delete that line
to move to `gemini-3.5-flash-lite`. The startup log shows which models are in use.

The key is only held in memory by the backend: it is not logged, not returned in any
response, and not visible if the config object is printed or serialised. Firebase Admin
credentials (a later milestone) belong in the same two places.

## Commands

Run from the `Backend` folder.

```bash
cd /d/AIChatbot-Gemini/Backend

npm.cmd install          # install dependencies
npm.cmd run dev          # development: TypeScript with automatic restart (tsx watch)
npm.cmd run typecheck    # type-check only, nothing is written
npm.cmd test             # focused checks with a fake Gemini; no network, no key
npm.cmd run build        # compile src -> dist (dist is cleaned first)
npm.cmd run start        # run the compiled server: node dist/server.js
```

`start` needs a prior `build` and does not depend on `tsx`. `dev` restarts when source
files change, but not when `.env.local` changes: stop it (Ctrl+C) and run it again.
On startup the server prints whether a Gemini key is configured (never the key itself).

## Run Frontend and Backend together

Use two terminals.

**Terminal 1 — Backend** (http://localhost:3001):

```bash
cd /d/AIChatbot-Gemini/Backend
npm.cmd run dev
```

**Terminal 2 — Frontend** (http://localhost:5173):

```bash
cd /d/AIChatbot-Gemini/Frontend
npm.cmd run dev
```

The frontend needs this line in `Frontend/.env.local`, next to the Firebase values (see
`Frontend/.env.example`); restart the frontend dev server after changing it:

```dotenv
VITE_API_BASE_URL=http://localhost:3001
```

Vite does not use a fixed port: if 5173 is busy it falls back to 5174, which the
backend will refuse. Free port 5173 (or add the new origin to `CORS_ALLOWED_ORIGINS`).

## Call `/api/health`

```bash
curl http://localhost:3001/api/health
```

Expected response (HTTP 200); it never calls Gemini:

```json
{"status":"ok","service":"aichatbot-gemini-backend"}
```

PowerShell: `Invoke-RestMethod http://localhost:3001/api/health`

The server binds IPv4 `0.0.0.0`. `curl` and browsers retry IPv4 automatically, but some
Node scripts resolve `localhost` to IPv6 (`::1`) first and fail with `ECONNREFUSED`;
use `http://127.0.0.1:3001` in those.

## Chat endpoint: `POST /api/chat`

Request (`Content-Type: application/json`), the new user message last:

```json
{"messages":[{"role":"user","content":"Hello"}]}
```

Continue a conversation by sending the earlier successful messages too:

```json
{"messages":[
  {"role":"user","content":"My favorite color is teal. Reply with just OK."},
  {"role":"assistant","content":"OK."},
  {"role":"user","content":"What is my favorite color? Answer in one word."}
]}
```

Success (HTTP 200):

```json
{"reply":"Teal"}
```

Rules, checked on every request:

- `messages` is a non-empty array of at most **50** items.
- `role` is `"user"` or `"assistant"`; the first and the last message are from the user.
- `content` is a non-empty string (not only whitespace) of at most **12,000** characters;
  all messages together at most **30,000** characters. These stay inside the 100 kb body limit
  even for Thai text.
- Each request is independent: the server keeps no chat session, so history from one user
  or conversation can never leak into another. Roles are mapped to Gemini's (`assistant` →
  `model`) and the latest user message is sent exactly once.

Errors use the shared JSON shape `{"error":{"code":"...","message":"..."}}`. Messages are
written for end users; provider messages, request details, the key, and stack traces are
never included (they are only logged without secrets).

| HTTP | `error.code` | When |
| --- | --- | --- |
| 400 | `invalid_request` | The body breaks one of the rules above. |
| 400 | `invalid_json` | The body is not valid JSON. |
| 413 | `payload_too_large` | The body is over 100 kb. |
| 422 | `ai_response_blocked` | Gemini blocked the prompt or the reply (safety filters). |
| 429 | `ai_rate_limited` | Gemini reported a rate or quota limit. The cause (per-minute vs daily) is not guessed; `error.retryAfterSeconds` carries Gemini's retry delay when it gave one. The server does **not** retry. |
| 429 | `rate_limited` | This server's own throttle (voice tokens and transcriptions), with `error.retryAfterSeconds`. |
| 502 | `ai_auth_failed` | Gemini rejected the server's API key. |
| 502 | `ai_model_unavailable` | `GEMINI_MODEL` does not exist or is not available to this key. |
| 502 | `ai_empty_response` | Gemini returned no text. |
| 502 | `ai_unavailable` / `ai_error` | Gemini is unreachable, returned a 5xx, or rejected the request. |
| 503 | `ai_not_configured` | `GEMINI_API_KEY` is not set. |
| 504 | `ai_timeout` | No answer within 45 seconds. |
| 500 | `internal_error` | Anything unexpected. |

Request settings: one `generateContent` call (complete reply, no streaming), reply limited
to 4,096 output tokens (Gemini counts its internal thinking in that limit), thinking level
`low`, a system instruction asking for plain text because the chat UI does not render
Markdown, **no tools, search grounding, or other capabilities**, and a single attempt (the
SDK's default of 5 automatic retries is switched off so quota errors are not repeated). If the
browser disconnects (for example the Stop button), the Gemini call is cancelled.

## Gemini models

Two models, both configurable and both with **no automatic fallback** (if one is unavailable
the feature reports an error instead of silently using another, possibly paid, model):

| Use | Variable | Default | Where it runs |
| --- | --- | --- | --- |
| Typed chat, and transcription for the Voice button | `GEMINI_MODEL` | `gemini-3.5-flash-lite` | `generateContent` on the backend |
| Live conversation | `GEMINI_LIVE_MODEL` | `gemini-3.8-live` | Gemini Live API, from the browser, with a backend-issued token |

References (documentation changes; re-check before relying on it):
[pricing](https://ai.google.dev/gemini-api/docs/pricing),
[deprecations](https://ai.google.dev/gemini-api/docs/deprecations),
[Live API](https://ai.google.dev/gemini-api/docs/live-api),
[ephemeral tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens),
[thinking](https://ai.google.dev/gemini-api/docs/thinking),
[rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), and the
[`@google/genai`](https://github.com/googleapis/js-genai) SDK (version in `package.json`,
whose installed typings were used).

What was **observed with real calls on 2026-10-19** with the project's own key (not just
read in the docs): `gemini-3.5-flash-lite` answered a one-word `generateContent` request in
about two seconds without a rate-limit error; `gemini-3.8-live` accepted a backend-issued
token, opened a session, answered spoken audio with audio and transcripts, and reported
output audio as 24 kHz PCM. Free-tier limits, model names and availability can change; a
429 from either model is reported as a rate limit (with Google's retry delay when given),
never assumed to be "daily quota exhausted". Switching the text model to Flash-Lite is a
configuration choice; it was **not** assumed to fix any earlier 429 — the real request above is
the only evidence. This integration is designed for the free tier; do not enable billing for it.
Free-tier content may be used to improve Google's products, so do not send private data.

`gemini-3.8-live` accepts no thinking settings, so none are sent for voice. For text, thinking
is `low` and the output cap is generous because thinking tokens count against it.

## Two voice modes

| | **Live** (button at the top right of the chat) | **Voice** (button next to Send) |
| --- | --- | --- |
| What it is | A real-time spoken conversation in its own full-screen view | Dictation: speak, check the text, then send |
| Flow | Speak; the AI listens and answers by voice at once | Speak → **End** → the speech becomes text in the message box → edit it → **Send** → the AI answers as text |
| Backend | `POST /api/live-token` (the browser then talks to Gemini Live directly) | `POST /api/transcribe` (a recording in, text out), then the normal `POST /api/chat` |
| Model | `GEMINI_LIVE_MODEL` | `GEMINI_MODEL` (transcription and the reply) |
| Reply | Spoken, streamed, with live transcripts | Text only |

Nothing from the Voice button reaches the AI chat until the user presses **Send**, and Live
never mixes with the text chat screen: while Live is open the chat is covered and cannot be
typed into. What was said in Live is saved in the conversation when Live ends.

## Live mode: `POST /api/live-token`

Live is a real Gemini Live conversation: microphone audio is streamed to Gemini and
Gemini's spoken reply is streamed back, with transcripts of both sides. The browser does
**not** use browser speech recognition or speech synthesis, and there is no mock mode.

```
Browser                         Backend                       Gemini
  | POST /api/live-token  --------> |  authTokens.create(API key)  --> |
  | <-- { token, model, ... } ----- |                                   |
  | wss Live API, token as credential ------------------------------->  |
  | <== audio + transcripts, both directions ========================== |
```

The permanent `GEMINI_API_KEY` stays on the backend: it is never sent to the browser, returned
in a response, logged, or placed in a Vite variable. The browser only receives a token that:

- can start **one** session (`uses: 1`), within **60 seconds** of being issued
  (`newSessionExpireTime`), and expires after **20 minutes** (`expireTime`; a voice-only Live
  session lasts at most 15 minutes);
- is **locked** to `GEMINI_LIVE_MODEL`, audio responses, input/output transcription, the
  server-side voice system instruction, and sliding-window context compression. Gemini
  ignores whatever the browser sends for those fields, so a leaked token cannot select another
  model or change the instructions;
- is returned with `Cache-Control: no-store` so no browser or proxy keeps it.

Response (HTTP 200): `{"token":"…","model":"gemini-3.8-live","expiresAt":"…","newSessionExpiresAt":"…"}`.
Errors use the shared JSON shape; a rate limit adds `error.retryAfterSeconds` and a
`Retry-After` header.

### Audio formats

| Direction | Format |
| --- | --- |
| Microphone → Gemini | raw little-endian 16-bit PCM, mono, **16 000 Hz**, sent as `audio/pcm;rate=16000` in about 43 ms chunks |
| Gemini → speaker | raw little-endian 16-bit PCM, mono, **24 000 Hz**, played from a scheduled queue |

Browsers capture at the device rate (usually 44.1 or 48 kHz), so the frontend resamples
(box filter) to 16 kHz in `Frontend/src/voice/audio.ts` using an `AudioWorklet`. `MediaRecorder`
is **not** used because it produces compressed WebM/Opus, not PCM.

### Session behavior

- Pressing **Live** (or **Voice**) is the only thing that asks for microphone permission.
  Denial, a missing microphone and an insecure page each show a specific message.
- States shown: connecting, listening, AI speaking, muted, ended, error. *Mute* stops
  transmitting (and disables the track); *End* releases the microphone, audio contexts and socket.
- **Barge-in:** when Gemini reports an interruption, queued playback is dropped immediately.
  The cut-off reply stays on screen, visibly marked *Interrupted*, and is not used as history.
- One Live session at a time. The Live button is disabled while a text reply is generating, and
  the full-screen Live view covers the chat while it runs. The session ends when you press
  **End** or **Back to chat**, leave Chat (Settings), sign out, or close the page.
- **Shared context:** completed exchanges (typed or spoken) are sent as text history when a
  voice session starts, and completed voice exchanges are used in later typed requests. The
  next utterance is live audio, so it is never sent twice. Partial/interrupted turns are not.
- **Limits and reconnecting:** context-window compression is enabled so a long conversation can
  continue by dropping the oldest context, but a voice-only session still ends at Gemini's
  session limit (about 15 minutes) or on a connection loss. Nothing promises unlimited
  sessions. When a session ends, completed messages stay and **Try again** opens a new one
  by hand — there is no automatic reconnect loop. Session *resumption handles* were tried with
  these tokens and did **not** preserve the conversation, so reconnecting uses a new token and
  re-seeds the context from the saved transcripts instead.
- **Secure context:** the browser only allows microphone access on `https://` pages and on
  `http://localhost`. Opening the dev server from a phone over `http://<LAN address>:5173` is
  not a secure context, so the microphone is blocked there; use HTTPS (a tunnel or a local
  certificate) for phone tests.

## Voice button: `POST /api/transcribe`

The browser records the microphone locally (mono 16-bit PCM, 16 kHz, built into a WAV by
`Frontend/src/voice/wav.ts`) and uploads **nothing until the user presses End**. The request
is the raw WAV (`Content-Type: audio/wav`, no base64, no JSON) and the response is
`{"text":"…"}`. The text is put into the message box; the user can edit it and presses Send
themselves, which is the ordinary `POST /api/chat` text path (so earlier typed *and* spoken
exchanges are its context).

- Limits: at least 0.3 s and at most 61 s (the app stops recording at 60 s), at most 2,000,000
  bytes; anything else is `400 invalid_audio` or `413 payload_too_large`; another content type is
  `415 unsupported_media_type`.
- Transcription is one `generateContent` call to `GEMINI_MODEL` with the audio inline. The system
  instruction treats the audio as data: it must be transcribed, never answered, translated or
  obeyed. Silence returns `422 no_speech`. Real check on 2026-10-19: English clips were
  transcribed correctly by `gemini-3.5-flash-lite` in about 2 s; **Thai was not checked with
  synthetic audio**, so use the manual test below.
- Nothing is stored or logged: the recording only exists in the request, and the error log uses
  the same allowlist as the other endpoints (never the audio or its text).
- A failed transcription keeps the recording in the browser so **Try again** sends the same
  audio; `no_speech` and `invalid_audio` are final. A rate limit adds `retryAfterSeconds` and the
  app does not retry before it has passed.
- The recording goes to Gemini like any other request, so the free-tier privacy note above applies.

### Throttling and abuse protection

`POST /api/live-token` is throttled in memory: **5 requests per client address per minute and
60 per minute overall**; over the limit it answers `429 rate_limited` with `retryAfterSeconds`
and does not call Gemini. `POST /api/transcribe` has its own counter: **10 per client address per
minute and 60 per minute overall**. The table is bounded (5,000 addresses). Set `TRUST_PROXY_HOPS` to the
number of proxies in front of the server (Render: `1`) so the real client address is used; with
`0` the socket address is used.

**These controls do not replace authentication.** The throttle is per process and resets on
restart, addresses can be shared or rotated, and the endpoint currently accepts any caller
that passes CORS. Before public use: verify the Firebase ID token (Firebase Admin) on
`/api/live-token`, `/api/transcribe` and `/api/chat`, and decide a **Guest policy** — for example no voice for
Guests, or a much lower quota keyed by a server-issued identifier — plus per-user usage
limits and monitoring. Until then anyone who can reach the server can start voice sessions
on your free quota.

### Logging

Startup logs the configured model names (never the key). Upstream failures are logged through
an explicit allowlist — operation, model, HTTP status, provider error code, the quota
metric/limit and retry delay when present — and never the SDK error object, headers, tokens,
keys, audio or conversation content. The browser logs only the close code of a server-closed
voice session.

## Verify a real Gemini reply

1. Put `GEMINI_API_KEY` in `Backend/.env.local` and start the backend (`npm.cmd run dev`).
   The startup log must say `Gemini: API key configured | text model: gemini-3.5-flash-lite | live (voice) model: gemini-3.8-live`
   (a different model name means an older `GEMINI_MODEL` line in `.env.local` is overriding the default).
2. Send one small request (Git Bash):

   ```bash
   curl -s -X POST http://localhost:3001/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Reply with exactly one word: pong"}]}'
   ```

   Expected: `{"reply":"pong"}` (wording may vary slightly). `ai_not_configured` means the key
   is missing; `ai_auth_failed` means it was rejected.
3. In the app: start both servers, open http://localhost:5173, choose **Guest** (or sign in),
   send a message, and wait for the reply to replace *Generating response...*. Then send a
   follow-up such as "What did I just say?" to confirm the earlier messages are used as context.

A failed request shows its message inside the conversation and does not block the next one;
the failed message is not sent again as history.

## Verify voice (manual test, about 8 minutes)

Use Chrome or Edge on `http://localhost:5173` (a secure context) with a microphone and speakers
or headphones (headphones avoid the AI hearing itself). Both servers must be running and
`GEMINI_API_KEY` set.

1. **Thai text:** type `ช่วยอธิบายสั้น ๆ ว่าฝนตกเกิดจากอะไร` and press Send; the reply is Thai, plain text.
2. **Voice button (speak → check → send):** press **Voice**, allow the microphone, say
   `ฝนตกเกิดจากอะไร`, press **End**. After a moment the Thai text appears in the message box and
   *nothing* has been sent yet. Fix a word if it is wrong, press **Send**: the AI answers in text.
   Try **Cancel** during recording (nothing is uploaded), and type something first, then dictate:
   the dictated text is added after what you typed.
3. **Live:** press **Live** at the top right. A separate full-screen view opens (LIVE badge). Wait
   for *Listening*, say `สวัสดี ช่วยเล่าเรื่องดวงจันทร์ให้ฟังสั้น ๆ`: you hear a Thai spoken answer and
   see both sides as transcripts; the status goes Listening → AI speaking → Listening.
4. **Interruption:** ask for a long story and speak over it. The speech stops at once, the
   cut-off reply is marked *interrupted*, and the AI answers you.
5. **Mute:** press **Mute**, speak: nothing is transcribed. **Unmute** and speak: it is.
6. **Back to the chat:** press **End**. The chat returns with the spoken exchange in it (marked
   *Voice*). Type `เมื่อกี้เราคุยเรื่องอะไร`: the answer uses it. Press **Live** again and ask by voice:
   it also knows the typed history.
7. **Cleanup:** the browser's microphone indicator turns off after **End**, **Back to chat**, **Cancel**,
   or when you open Settings or reload during a session.
8. **Errors:** block the microphone for the site (lock icon → Microphone → Block) and press
   **Voice** or **Live**: a message explains how to allow it. Stop the backend and press **Voice**
   after recording: the message says the service cannot be reached and **Try again** keeps the recording.

## Verify browser-to-backend connectivity

With both servers running and `VITE_API_BASE_URL` set:

1. Open http://localhost:5173 and open DevTools (F12) > Console.
2. Run the raw browser request (this exercises CORS):

   ```js
   fetch('http://localhost:3001/api/health').then(r => r.json()).then(console.log)
   ```

   Expected: `{status: 'ok', service: 'aichatbot-gemini-backend'}`

3. Run the same request through the frontend's typed helper (`Frontend/src/api/client.ts`,
   available in the dev server only):

   ```js
   (await import('/src/api/client.ts')).fetchBackendHealth().then(console.log)
   ```

   Expected: the same object.

Troubleshooting:

| Symptom | Likely cause |
| --- | --- |
| Console says the request was blocked by CORS policy | The page origin is not in `CORS_ALLOWED_ORIGINS` (for example Vite moved to port 5174). |
| `ERR_CONNECTION_REFUSED` | The backend is not running, or runs on another `PORT`. |
| Chat shows "The chat service is not configured" | `VITE_API_BASE_URL` is missing from `Frontend/.env.local`, or the dev server was not restarted. |
| Chat shows "Could not reach the chat service" | The backend is not running or the URL/port is wrong. |
| `Configuration error: ...` at startup | Fix the variable named in the message. |
| `EADDRINUSE` | Another process uses the port; stop it or change `PORT`. |

The app itself never calls the backend on startup, and there is no health widget in
the UI by design.

## Limitations of this milestone

- **No authentication yet.** `POST /api/chat` and `POST /api/live-token` accept any request
  from any client (CORS only restricts browsers). The voice-token throttle is a speed bump,
  not protection: it is per process, in memory, and `/api/chat` has none. Anyone who can reach
  the server can spend the free quota. Before exposing it publicly, add Firebase ID-token
  verification (Firebase Admin), real per-user limits, and a Guest policy (see
  [Throttling](#throttling-and-abuse-protection)).
- Typed replies arrive as one complete response (no streaming); the Stop button cancels the
  request. Voice replies are streamed.
- Live sessions are bounded (about 15 minutes) and are not resumed across reconnects;
  context is re-seeded from saved text. Voice quality, latency and Thai accuracy depend on
  the model and the device; only a short real-audio check was done (see the report), so
  the manual test above matters.
- Both voice modes need a secure context (HTTPS or `localhost`) and a browser with `AudioWorklet`.
- The Voice button answers in text only; there is no text-to-speech. A recording is limited to 60 seconds.
- Conversations live only in the browser tab. There is no Firestore persistence, so a
  reload clears them.
- Replies are plain text; the chat UI does not render Markdown.
- Free-tier quota or model availability can change; an exhausted quota shows as
  `ai_rate_limited`.
- Not deployed; the Render settings below are a plan only.

## Planned Render deployment (not done yet)

Nothing has been deployed. The intended Render Web Service settings — confirm them
against Render's current documentation when deploying:

| Setting | Value |
| --- | --- |
| Root Directory | `Backend` |
| Build Command | `npm ci --include=dev && npm run build` (TypeScript is a dev dependency) |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Environment | `NODE_ENV=production`, `CORS_ALLOWED_ORIGINS=https://aichatbot-gemini.web.app` (add `https://aichatbot-gemini.firebaseapp.com` if that URL is used), `GEMINI_API_KEY` (as a secret), optionally `GEMINI_MODEL` / `GEMINI_LIVE_MODEL`, `TRUST_PROXY_HOPS=1`, and a Node 22 version (for example `NODE_VERSION=22`) |

Render provides `PORT` itself; the server reads it and binds `0.0.0.0`. After the backend
URL exists, set `VITE_API_BASE_URL` to it in the frontend build environment before
deploying the frontend to Firebase Hosting.
