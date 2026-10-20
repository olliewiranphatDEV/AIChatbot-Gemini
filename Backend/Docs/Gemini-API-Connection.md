# Gemini API Connection

Project: **AIChatbot-Gemini**  
Guide date: **19 October 2026**

## Table of Contents

- [Purpose and deployment scope](#purpose-and-deployment-scope)
- [1. Create a Gemini API key in Google AI Studio](#1-create-a-gemini-api-key-in-google-ai-studio)
  - [Step 1: Open Google AI Studio](#step-1-open-google-ai-studio)
  - [Step 2: Import the existing project if it is missing](#step-2-import-the-existing-project-if-it-is-missing)
  - [Step 3: Create the key](#step-3-create-the-key)
  - [Step 4: Identify which value the application needs](#step-4-identify-which-value-the-application-needs)
- [2. Install the Gemini SDK in Backend](#2-install-the-gemini-sdk-in-backend)
  - [Step 1: Open the backend directory](#step-1-open-the-backend-directory)
  - [Step 2: Install the official JavaScript / TypeScript SDK](#step-2-install-the-official-javascript--typescript-sdk)
  - [Step 3: Confirm it is installed](#step-3-confirm-it-is-installed)
- [3. Configure the backend environment](#3-configure-the-backend-environment)
  - [Step 1: Open the correct local file](#step-1-open-the-correct-local-file)
  - [Step 2: Add the runtime values](#step-2-add-the-runtime-values)
  - [Step 3: Maintain a secret-free example file](#step-3-maintain-a-secret-free-example-file)
  - [Step 4: Restart after editing](#step-4-restart-after-editing)
- [4. Configure the frontend backend URL](#4-configure-the-frontend-backend-url)
  - [Step 1: Open the frontend environment file](#step-1-open-the-frontend-environment-file)
  - [Step 2: Keep Firebase values and add the API URL](#step-2-keep-firebase-values-and-add-the-api-url)
  - [Step 3: Restart Vite](#step-3-restart-vite)
- [5. Connect the backend endpoint to Gemini](#5-connect-the-backend-endpoint-to-gemini)
  - [Why this code is required](#why-this-code-is-required)
  - [Step 1: Load and validate configuration](#step-1-load-and-validate-configuration)
  - [Step 2: Initialize the SDK server-side](#step-2-initialize-the-sdk-server-side)
  - [Step 3: Provide the chat route](#step-3-provide-the-chat-route)
  - [Step 4: Send conversation context correctly](#step-4-send-conversation-context-correctly)
  - [Step 5: Validate requests and handle failures](#step-5-validate-requests-and-handle-failures)
- [6. Connect the frontend Chat page](#6-connect-the-frontend-chat-page)
  - [Step 1: Use the frontend API helper](#step-1-use-the-frontend-api-helper)
  - [Step 2: Maintain request state](#step-2-maintain-request-state)
  - [Step 3: Understand the complete text flow](#step-3-understand-the-complete-text-flow)
- [7. Run and verify the local application](#7-run-and-verify-the-local-application)
  - [Step 1: Start Backend in Terminal 1](#step-1-start-backend-in-terminal-1)
  - [Step 2: Start Frontend in Terminal 2](#step-2-start-frontend-in-terminal-2)
  - [Step 3: Check backend health](#step-3-check-backend-health)
  - [Step 4: Test one real chat request](#step-4-test-one-real-chat-request)
  - [Step 5: Test the Chat page and context](#step-5-test-the-chat-page-and-context)
  - [Step 6: Run project checks after code changes](#step-6-run-project-checks-after-code-changes)
- [8. Select models and inspect quota](#8-select-models-and-inspect-quota)
  - [Step 1: Keep text and Live configuration separate](#step-1-keep-text-and-live-configuration-separate)
  - [Step 2: Open the rate-limit page](#step-2-open-the-rate-limit-page)
  - [Step 3: Investigate HTTP 429 using evidence](#step-3-investigate-http-429-using-evidence)
- [9. Live voice connection and dedicated screen](#9-live-voice-connection-and-dedicated-screen)
  - [What is separate from text chat](#what-is-separate-from-text-chat)
  - [Step 1: Configure the Live model](#step-1-configure-the-live-model)
  - [Step 2: Follow the approved page behavior](#step-2-follow-the-approved-page-behavior)
  - [Step 3: Verify voice separately](#step-3-verify-voice-separately)
- [10. Verification checkpoint and deployment boundary](#10-verification-checkpoint-and-deployment-boundary)
  - [What the conversation establishes](#what-the-conversation-establishes)
  - [Before a future public deployment](#before-a-future-public-deployment)
- [Official references](#official-references)

## Purpose and deployment scope

It covers the work needed to connect the application to Gemini:

1. Import the existing project into Google AI Studio and create a Gemini API key.
2. Install the backend SDK and configure local environment files.
3. Connect the backend chat endpoint to Gemini and the frontend Chat page to that endpoint.
4. Run both applications and verify a real response and conversation context.
5. Understand model selection, quota errors, and the separately added Live voice feature.

**Creating an API key alone does not connect the Chat page to Gemini.** The backend SDK integration, API route, frontend requests, and conversation handling are also required.

| Component | Responsibility | Agreed hosting destination |
| --- | --- | --- |
| Frontend | Sign-in, Chat, Settings, and the dedicated Live interface when completed | Firebase Hosting |
| Firebase Authentication | Google account sign-in | Firebase |
| Backend | Validate chat requests, keep the Gemini key server-side, call Gemini, and return safe responses | Render |
| Gemini API | Generate text replies and support Live voice conversations | Google Gemini API |
| Cloud Firestore | Persistent chat history when implemented | Firebase |

Keep Firebase on **Spark**, without enabling billing as part of this guide. Gemini usage has its own model availability and quotas; Firebase Spark does not provide unlimited Gemini access. Public deployment and Firestore setup are separate work.

Commands below use **Git Bash on Windows**. `npm.cmd` is the Windows npm launcher; on macOS/Linux, use `npm`. In PowerShell, use Windows directory paths with `Set-Location`, and use `curl.exe` instead of `curl` for the HTTP examples.

## 1. Create a Gemini API key in Google AI Studio

### Step 1: Open Google AI Studio

1. Open [Google AI Studio](https://aistudio.google.com/).
2. Sign in with the Google Account that can manage **AIChatbot-Gemini**.
3. Complete the initial terms or welcome prompts if shown.
4. Open **Dashboard** and then **Projects**.

Use the existing Google Cloud project associated with Firebase. There is no need to create another Firebase project or another repository for this connection.

### Step 2: Import the existing project if it is missing

1. On **Projects**, click **Import projects**.
2. Search for **AIChatbot-Gemini**.
3. Confirm the project ID is **aichatbot-gemini**.
4. Select that project and click **Import**.

**Expected result:** the existing project appears in AI Studio and can be selected when creating an API key. Importing makes it available in AI Studio; it does not copy the Firebase database or create a second project.

If the project is already listed, select it and continue. Console wording may change; use the project ID to distinguish similarly named projects.

### Step 3: Create the key

1. Open **API Keys** in the dashboard.
2. Click **Create API key**.
3. Enter **Gemini API Key** as the key name if a name field is shown.
4. Select the imported **AIChatbot-Gemini** project.
5. Click **Create key** or the equivalent confirmation button.
6. Open the new key's details and copy the actual **API key value**.

**Expected result:** AI Studio lists the key under the correct project. Creating a key is not itself proof that every model is available to that project.

The setup followed in this project used AI Studio's key creation flow. Do not add manual OAuth, service-account JSON, or Cloud billing steps solely to reproduce this setup.

### Step 4: Identify which value the application needs

| Value | Purpose | Required by this application's Gemini connection? |
| --- | --- | --- |
| `GEMINI_API_KEY` | Secret used by the backend to authenticate Gemini requests | **Yes** |
| `GEMINI_MODEL` | Application setting selecting the text model | Supported by the text integration; an explicit value avoids relying on a default |
| `GEMINI_LIVE_MODEL` | Application setting selecting the Live voice model | Used when the Live configuration has been implemented |
| `GEMINI_API_NAME` | Descriptive key name, such as `Gemini API Key` | No; metadata unless application code explicitly reads it |
| `GEMINI_API_PROJECT_NAME` | Project resource name, such as `projects/389698903940` | No for this API-key-based connection |
| `GEMINI_API_PROJECT_NUMBER` | Numeric project identifier | No for this API-key-based connection |

The key name and project number are not substitutes for the secret key value. These custom metadata variable names do not configure the SDK automatically.

## 2. Install the Gemini SDK in Backend

### Step 1: Open the backend directory

```bash
cd /d/AIChatbot-Gemini/Backend
```

### Step 2: Install the official JavaScript / TypeScript SDK

```bash
npm.cmd install @google/genai
```

| Command part | Meaning |
| --- | --- |
| `npm.cmd` | Runs npm on Windows |
| `install` | Installs a dependency in the current package |
| `@google/genai` | Google's SDK used to call Gemini from TypeScript / JavaScript |

Install it in **Backend**, where the text-generation call and permanent key belong. This is a project dependency, so do not add `-g`.

The user already completed this installation. Do not reinstall it just because this guide contains the command. The installation reported **0 vulnerabilities** and a `node-domexception` deprecation warning; the warning did not mean installation failed.

### Step 3: Confirm it is installed

```bash
npm.cmd ls @google/genai
```

**Expected result:** npm lists the installed SDK version. Keep the project's lockfile and compatible SDK version rather than assuming every future version has identical APIs.

## 3. Configure the backend environment

### Step 1: Open the correct local file

Create or open:

```text
D:\AIChatbot-Gemini\Backend\.env.local
```

**The agreed backend filename is `.env.local`, not `.env`.** The backend configuration loader must explicitly read `Backend/.env.local`; installing the SDK does not automatically load that file.

The backend setup was reported to use `dotenv` with an explicit path that works when running source code and compiled code. Node/Express does not inherit Vite's environment-file behavior.

### Step 2: Add the runtime values

Use this local configuration, replacing the key placeholder with the actual value copied from AI Studio:

```dotenv
NODE_ENV=development
PORT=3001
CORS_ALLOWED_ORIGINS=http://localhost:5173

GEMINI_API_KEY=PASTE_YOUR_ACTUAL_GEMINI_API_KEY_HERE
GEMINI_MODEL=gemini-3.5-flash-lite

# For the Live voice integration, when supported by Backend configuration.
GEMINI_LIVE_MODEL=gemini-3.8-live
```

| Variable | Meaning |
| --- | --- |
| `NODE_ENV` | Selects the backend environment; use `development` locally |
| `PORT` | Backend HTTP port; this project's local value is `3001` |
| `CORS_ALLOWED_ORIGINS` | Browser origins allowed by the backend; the local frontend uses `http://localhost:5173` |
| `GEMINI_API_KEY` | Permanent Gemini secret; Backend only |
| `GEMINI_MODEL` | Selected text model; the latest agreed choice is `gemini-3.5-flash-lite` |
| `GEMINI_LIVE_MODEL` | Selected Live model; the latest agreed choice is `gemini-3.8-live` |

Copy the key value only, without the key's label or project metadata. Do not put the key in a variable beginning with `VITE_`.

The initial working integration used **`gemini-3.8-flash`**. After upstream 429 errors, the agreed text model changed to **`gemini-3.5-flash-lite`**. This example records the latest selection; verify the actual running model through the backend startup log. An existing `GEMINI_MODEL` value can override a new code default.

Adding `GEMINI_LIVE_MODEL` does not implement voice by itself. It is separate from the text model and requires Live-specific code.

### Step 3: Maintain a secret-free example file

Create or update **`Backend/.env.example`** with the same configuration names, but leave the secret empty:

```dotenv
NODE_ENV=development
PORT=3001
CORS_ALLOWED_ORIGINS=http://localhost:5173

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_LIVE_MODEL=gemini-3.8-live
```

| File | Purpose | Commit to Git? |
| --- | --- | --- |
| `Backend/.env.local` | Real local runtime configuration, including the secret | No |
| `Backend/.env.example` | Configuration template without a secret | Yes |
| `Frontend/.env.local` | Frontend Firebase configuration and backend URL | Keep local under the project's existing convention |

Keep `.env.local`, dependencies, and build output excluded by the repository's ignore rules. A template is useful only when it remains secret-free and available to other checkouts.

### Step 4: Restart after editing

Stop the backend with **Ctrl+C** and start it again after changing environment values. Do not rely on source-file watching to reload environment files.

Preserve the backend's existing environment precedence. If the process already has a conflicting variable from the terminal or deployment platform, editing a file may not change the effective value. When SDK auto-discovery is used, `GOOGLE_API_KEY` takes precedence over `GEMINI_API_KEY` if both are set. The project should use its configured key explicitly and never print its value.

## 4. Configure the frontend backend URL

### Step 1: Open the frontend environment file

```text
D:\AIChatbot-Gemini\Frontend\.env.local
```

### Step 2: Keep Firebase values and add the API URL

Keep the existing Firebase variables. Add or update this line without replacing the rest of the file:

```dotenv
VITE_API_BASE_URL=http://localhost:3001
```

**Expected result:** the frontend API helper uses this base URL to reach the local backend. It appends routes such as `/api/chat`; do not add `/api/chat` to the base URL itself.

This URL is public frontend configuration. The Gemini key remains in **`Backend/.env.local`** and must not be copied into **`Frontend/.env.local`**.

### Step 3: Restart Vite

Vite loads environment files when starting and building. Restart the frontend dev server after edits. Production environment values are incorporated during the build; Firebase Hosting does not load the local file at runtime.

## 5. Connect the backend endpoint to Gemini

### Why this code is required

Firebase Google sign-in identifies the user. It does not generate AI responses. The backend needs application code that reads configuration, validates a chat request, calls Gemini, and returns the reply to the frontend.

The following steps describe the integration implemented in this project, based on the coding-agent report. They are not instructions to replace working files with a second implementation.

### Step 1: Load and validate configuration

The backend reads its port, CORS settings, Gemini key, and text model from the configured environment. It may log that a key is configured and which model is selected, but must not log the key itself.

### Step 2: Initialize the SDK server-side

The text service uses `GoogleGenAI` from `@google/genai` and calls `models.generateContent` using the configured key and model. The permanent key never travels through the frontend text-chat request.

The project's reported integration uses the Generate Content API. Do not replace that working integration solely because a newer getting-started page demonstrates another API style.

### Step 3: Provide the chat route

The application contract is:

```http
POST /api/chat
Content-Type: application/json
```

Example request:

```json
{
  "messages": [
    { "role": "user", "content": "Hello. Please reply briefly." }
  ]
}
```

Example success shape; the wording of `reply` is generated dynamically:

```json
{
  "reply": "Hello! How can I help?"
}
```

### Step 4: Send conversation context correctly

The reported implementation treats each text request independently and sends the relevant conversation history with it:

1. Keep the application roles as `user` and `assistant`.
2. Convert `assistant` to Gemini's `model` role before calling the SDK.
3. Include the latest user message once.
4. Exclude failed or cancelled turns from subsequent completed-turn context.
5. Keep requests isolated between conversations and users.

Without history in the request, a later question such as “What did I just tell you?” cannot reliably refer to earlier turns. This request context is separate from saving messages in Firestore.

### Step 5: Validate requests and handle failures

The initial integration report specified limits of **50 messages**, **12,000 characters per message**, and **30,000 total characters**. These are application validation limits, not Gemini token quotas; confirm them against current code if they are changed later.

The integration also includes safe provider-error mapping, bounded retries, timeout/cancellation handling, and plain-text replies for the current renderer. Stop cancels the application's request; it does not guarantee that work already accepted by the provider consumes no quota.

## 6. Connect the frontend Chat page

### Step 1: Use the frontend API helper

The frontend sends `{ messages }` to `VITE_API_BASE_URL + /api/chat` through the existing API layer. It reads `{ reply }` and inserts the assistant's reply into the originating conversation.

### Step 2: Maintain request state

1. Add the user's message to the active conversation.
2. Show the existing loading state while waiting.
3. Prevent duplicate submissions during that request.
4. On success, show the returned assistant text.
5. On failure, show the safe application error rather than a fabricated answer.
6. Support Stop and navigation without inserting a stale reply into another conversation.

### Step 3: Understand the complete text flow

| Stage | What happens |
| --- | --- |
| User presses Send | Frontend collects the latest message and relevant completed history |
| Frontend calls Backend | Sends JSON to `POST http://localhost:3001/api/chat` |
| Backend validates | Checks the request and converts application roles to Gemini roles |
| Backend calls Gemini | Uses its own secret key and configured text model |
| Gemini responds | Returns generated content or a provider error |
| Backend responds | Returns `{ reply }` or a safe JSON error |
| Frontend renders | Updates the original conversation and clears its loading state |

The initial integration report named `Backend/src/gemini.ts`, `src/errors.ts`, and `src/routes/chat.ts`, together with backend configuration/middleware changes. Frontend changes included `src/api/chatMessages.ts`, the API client/types, `ChatPage.tsx`, and `ChatMessage.tsx`. Use the current repository as the authority for their exact locations after later refactors.

## 7. Run and verify the local application

### Step 1: Start Backend in Terminal 1

```bash
cd /d/AIChatbot-Gemini/Backend
npm.cmd run dev
```

**Expected result:** the server starts on port `3001`. Its log shows the allowed frontend origin and the effective Gemini model, without exposing the key.

For the latest agreed text configuration, the model log should identify **`gemini-3.5-flash-lite`**. If it still identifies **`gemini-3.8-flash`**, check the effective configuration and restart.

### Step 2: Start Frontend in Terminal 2

```bash
cd /d/AIChatbot-Gemini/Frontend
npm.cmd run dev
```

**Expected result:** Vite prints the frontend URL, normally **http://localhost:5173**. Keep both terminals running.

The backend allows the exact origin `http://localhost:5173` in this local example. If Vite moves to `5174`, free port `5173` or update the backend's permitted origin deliberately and restart. A different port is a different browser origin.

### Step 3: Check backend health

From another Git Bash terminal:

```bash
curl -i http://localhost:3001/api/health
```

Expected JSON body:

```json
{"status":"ok","service":"aichatbot-gemini-backend"}
```

Health confirms that the HTTP server is reachable. It does **not** prove that Gemini credentials, model access, or quota are working.

### Step 4: Test one real chat request

```bash
curl -i http://localhost:3001/api/chat \
  -H 'Content-Type: application/json' \
  --data-raw '{"messages":[{"role":"user","content":"Reply with exactly: pong"}]}'
```

**Expected result:** HTTP `200` and a JSON object containing a real `reply`, ideally `pong` for this short prompt. Exact generated wording is not guaranteed. A non-200 response must be investigated rather than counted as a successful model call.

This request goes to the application's backend; no Gemini key belongs in the command. Make only a small number of live checks to conserve quota.

If a Node-based diagnostic resolves `localhost` to IPv6 and fails while the server listens on IPv4, test **127.0.0.1:3001**. Do not unnecessarily change the frontend hostname, since browser origins must still match CORS.

### Step 5: Test the Chat page and context

1. Open the URL printed by Vite.
2. Sign in with Google or use the existing Guest flow.
3. Start a new conversation and send: **My favorite color is teal.**
4. Wait for a completed assistant response.
5. Send: **What is my favorite color?**
6. Confirm that the answer uses the earlier context.
7. Test one Thai message, such as **Please answer in Thai: what can you help me with?**
8. Test Stop during a request and New chat without an old reply appearing in the new conversation.

Use browser DevTools **Network → Fetch/XHR → chat** to inspect the request payload, status, and response if it fails. API-level success and browser-level success are separate checks.

### Step 6: Run project checks after code changes

Backend:

```bash
cd /d/AIChatbot-Gemini/Backend
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Frontend:

```bash
cd /d/AIChatbot-Gemini/Frontend
npm.cmd run lint
npm.cmd run build
```

These are the scripts reported for the integration. Run each check and inspect its result; mocked tests do not prove current Gemini availability or remaining quota.

## 8. Select models and inspect quota

### Step 1: Keep text and Live configuration separate

| Interaction | Latest agreed model | Connection |
| --- | --- | --- |
| Type a message and press Send | `gemini-3.5-flash-lite` | Frontend HTTP request to Backend, then Gemini text generation |
| Start continuous spoken conversation | `gemini-3.8-live` | Gemini Live API with streamed audio |

Flash-Lite was selected for text testing after the initial Flash model returned quota-related errors. The project's dashboard showed a higher requests-per-minute allowance for Flash-Lite at that checkpoint. This is not a guarantee that changing the model fixes every 429 or provides better answers for every task.

### Step 2: Open the rate-limit page

1. Open [Google AI Studio Rate Limit](https://aistudio.google.com/rate-limit).
2. Select **AIChatbot-Gemini**.
3. Select the time range and inspect the actual model used by the backend.
4. Scroll horizontally if needed to see all quota columns.
5. Distinguish the project's current limits from a **Compare tiers** overlay. Comparison figures are not an upgrade applied to the project.

Changing the dashboard's model dropdown changes the displayed graph; it does not change the app's runtime model.

| Metric | Meaning |
| --- | --- |
| RPM | Requests per minute |
| TPM | Input tokens per minute; tokens are not the same as characters |
| RPD | Requests per day |
| Peak usage | Highest usage recorded for the metric within the selected time range |

For example, **Peak 3 / limit 5** under RPM means a recorded peak of three requests in one minute against a five-per-minute limit. It does not mean only two requests remain for the entire day. Quotas are scoped to the project, so users share them and creating another key does not create a fresh project allowance.

An **Unlimited** label under Live RPM applies to that metric only. It does not remove token limits or session constraints. Exact current allowances must be checked for the selected model and project.

### Step 3: Investigate HTTP 429 using evidence

The application displayed this sanitized response during testing:

```json
{
  "error": {
    "code": "ai_rate_limited",
    "message": "The AI service is busy or its free quota is used up. Try again later."
  }
}
```

The backend terminal also reported **upstream status 429**. This confirms that Gemini rejected those requests, but the generic application error does not identify which allowance was exceeded.

1. Inspect usage and limits for the correct project/model.
2. Inspect safe provider diagnostic fields, if the application records them: status, quota metric, quota limit, and retry delay.
3. If only the generic application code is logged, add narrowly filtered diagnostics before drawing a more specific conclusion. Do not log full SDK errors, headers, keys, tokens, or conversation content.
4. Respect retry guidance. A per-minute limit and a daily limit need different waiting periods; repeatedly pressing Send is not a diagnostic fix.

Do not enable billing merely because a generic 429 message appeared. Review the actual quota and desired usage first. Free-tier content handling and model pricing are described in Google's current pricing documentation; do not use sensitive test content.

## 9. Live voice connection and dedicated screen

### What is separate from text chat

Continuous voice uses **`gemini-3.8-live`** and the Live API. It cannot be implemented merely by changing the text model name on `/api/chat`.

The agreed approach is for Backend to create a short-lived, constrained token and for Frontend to use it to open the Live connection. The permanent key stays server-side. The implementation also needs microphone permission, audio capture/playback, transcription, interruption handling, and cleanup.

The configuration entry alone does not implement these pieces. This guide does not invent a token endpoint path; use the endpoint implemented in the current backend.

### Step 1: Configure the Live model

When the Live configuration is supported, keep this line in **`Backend/.env.local`** and restart Backend:

```dotenv
GEMINI_LIVE_MODEL=gemini-3.8-live
```

### Step 2: Follow the approved page behavior

The latest approved UI direction is:

1. Add a **Live** button at the top-right of the Chat header.
2. Open a separate full-page Live interface for the originating conversation.
3. Show connection/listening/speaking status, elapsed time, captions, Mute, and End live.
4. End the session and release the microphone when returning to Chat.
5. Keep completed voice transcripts associated with the original conversation.
6. Support mobile, tablet, and desktop using the existing white-and-green theme.

This dedicated page was designed and an implementation prompt was supplied. Its completed implementation has not yet been confirmed in this conversation. Earlier screenshots already showed voice-labelled messages and an inline voice-ended panel in Chat; they do not prove completion of the new page or every voice test.

### Step 3: Verify voice separately

Test microphone permission, real audio input/output, Thai transcription, interruption, mute, captions, text/voice context, reconnect behavior, and cleanup. Microphone access requires a secure context; localhost is suitable for desktop development, while opening an ordinary HTTP LAN address on a phone may prevent microphone access. Responsive browser emulation is not proof of a physical-device microphone test.

## 10. Verification checkpoint and deployment boundary

### What the conversation establishes

| Item | Evidence / status on 19 October 2026 |
| --- | --- |
| Google sign-in | User confirmed Google account sign-in and access to Chat |
| Gemini API key | User confirmed creating the key and saving it in Backend configuration |
| SDK | User provided successful `@google/genai` installation output |
| Initial text integration | Coding agent reported real backend and browser replies using `gemini-3.8-flash` |
| Later availability issue | User supplied failed requests and Backend logs showing upstream 429; successful earlier calls do not prove current quota availability |
| Latest text-model decision | `gemini-3.5-flash-lite` selected; verify the current effective model and a fresh real response rather than assuming the switch succeeded |
| Voice in Chat | User screenshots show voice-labelled conversation content and an inline voice-ended panel |
| Dedicated Live page | Design approved and implementation prompt supplied; completion not yet confirmed |
| Firestore history / public deployment | Not confirmed completed by the evidence used for this guide |

The initial integration agent reported passing Backend typecheck/build, **45 mocked tests**, Frontend build/lint, and **19 existing non-emulator Playwright tests**. These are reported results from that revision, not tests independently rerun for this document or proof of the later Live page.

### Before a future public deployment

- Frontend remains on **Firebase Hosting**; Backend remains on **Render** under the agreed plan.
- Set Backend secrets through Render's environment configuration rather than committing the local file.
- Use `NODE_ENV=production` and explicit permitted Firebase Hosting origins. The reported backend refuses to start in production without its required CORS configuration.
- Set `VITE_API_BASE_URL` to the actual HTTPS Backend URL **before building** the deployed frontend. Do not deploy a build that points to `localhost:3001`.
- Firebase Google sign-in in Frontend is not by itself authentication enforcement on Backend. Before opening the API publicly, verify Firebase ID-token enforcement, rate limits, and the Guest policy. CORS is a browser-origin control, not API authentication.
- Verify Live token constraints and abuse protection separately. Do not infer public readiness from a successful local voice session.

This guide records configuration and integration steps; it does not deploy either application or claim that persistence and production access controls are complete.

## Official references

- [Gemini API keys and importing projects](https://ai.google.dev/gemini-api/docs/api-key)
- [Google Gen AI SDK for JavaScript / TypeScript](https://github.com/googleapis/js-genai)
- [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
- [Gemini 3.8 Live](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live)
- [Gemini API pricing and Free tier](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Google AI Studio Rate Limit dashboard](https://aistudio.google.com/rate-limit)
- [Gemini API troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting)
- [Live API overview](https://ai.google.dev/gemini-api/docs/live-api)
- [Live ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)
- [Vite environment variables](https://vite.dev/guide/env-and-mode)
- [Browser microphone access and secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

Console instructions follow the screens used in this project; official API-key, SDK, model, pricing, and environment documentation was checked on **19 October 2026**. Model access, quotas, and UI labels can change.
