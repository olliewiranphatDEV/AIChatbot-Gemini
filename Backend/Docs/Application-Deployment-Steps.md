# Application Deployment Steps

Project: **AIChatbot-Gemini**  
Guide date: **20 October 2026**

Deploy **Backend first**, then configure and deploy **Frontend** using the Backend's public HTTPS URL.

| Application | Hosting service | Source directory |
| --- | --- | --- |
| Backend — Node.js, Express, TypeScript | Render Web Service | `Backend/` |
| Frontend — React, TypeScript, Vite | Standard Firebase Hosting | `Frontend/` |

Local commands below use **Git Bash on Windows**. Use `npm.cmd` and `firebase.cmd` locally; Render runs Linux commands such as `npm`, without `.cmd`. In PowerShell, use `Set-Location` with Windows paths and `curl.exe` for the HTTP examples.

URLs containing `YOUR_RENDER_SERVICE` are placeholders. Replace them with the exact URL Render assigns to the service.

## Section 1: Deploy Backend on Render

### 1. Verify the local production build

Open a terminal and run:

```bash
cd /d/AIChatbot-Gemini/Backend
npm.cmd ci --include=dev
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Run each command and check its result before continuing. `npm ci` installs the versions recorded in `package-lock.json`; `--include=dev` includes TypeScript and other tools needed to build.

Confirm the existing `start` script runs the compiled server, reported for this project as `node dist/server.js`. Test it locally:

```bash
npm.cmd start
```

**Expected result:** Backend starts successfully from `dist`. Stop it with **Ctrl+C** when finished.

Before creating the Render service, verify that the server:

- Reads its listening port from `process.env.PORT` and binds to **`0.0.0.0`**.
- Accepts platform-provided environment variables without requiring a local `.env.local` file to exist.
- Provides **`GET /api/health`**.
- Keeps API keys and Live tokens out of logs and error responses.
- Has the intended request limits and Live-token protections configured for external access.

The local file remains **`Backend/.env.local`**. Render configuration will be supplied through its Environment settings.

### 2. Make the reviewed code available to Render

1. Confirm the application code and `Backend/package-lock.json` are present in the Git repository.
2. Review and push the intended deployment revision to GitHub.
3. Choose the branch containing that revision. Use `develop` only if it is the branch you intend to deploy.
4. Confirm real `.env.local` files and secret values are excluded from Git.

Frontend and Backend can remain in the same repository. Render will build only the Backend directory selected below.

### 3. Create a Render Web Service

1. Open [Render Dashboard](https://dashboard.render.com/) and sign in.
2. Click **New → Web Service**.
3. Select **Git Provider** and connect GitHub if needed.
4. Select the repository containing **AIChatbot-Gemini**.
5. Choose the intended deployment branch.
6. Enter the service configuration:

| Setting | Value |
| --- | --- |
| Name | `aichatbot-gemini-backend`, or another available service name |
| Language / Runtime | **Node** |
| Branch | The reviewed deployment branch |
| Root Directory | **`Backend`**, preserving capitalization |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Instance Type | **Free** for the initial deployment |
| Health Check Path, when offered | `/api/health` |

Render runs build/start commands relative to the chosen Root Directory. Do not add another `cd Backend` to these commands. This assumes Backend owns its `package.json` and lockfile, as in the current project layout.

Use a Node version compatible with the repository's `engines` declaration or existing Node-version file. If no version is pinned, select a supported version already tested with this project before relying on the platform default.

### 4. Set Render environment variables

Before the first deploy, add the following in the service's **Environment** settings. If the service was already created, open **Environment**, edit the values, and save/redeploy.

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `CORS_ALLOWED_ORIGINS` | `https://aichatbot-gemini.web.app` |
| `GEMINI_API_KEY` | The real Gemini key copied from the local Backend configuration |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` |
| `GEMINI_LIVE_MODEL` | `gemini-3.8-live` |

Enter names and values in separate fields. Do not include quotation marks around values unless the application explicitly requires them.

- Use the actual Firebase Hosting origin if it differs from the default above. Origins contain the scheme and hostname, without a route or trailing slash.
- If users will also open `https://aichatbot-gemini.firebaseapp.com` or a custom domain, add each origin using the list format supported by the backend's configuration parser. Do not use `*`.
- Let Render supply **`PORT`**. Do not copy the local `PORT=3001` value into Render by default.
- Store the permanent Gemini key only in Backend's Render environment, never in frontend configuration.
- Do not upload the local environment file or create it in the repository for deployment.

### 5. Deploy and inspect the logs

1. Click **Deploy Web Service**, or the equivalent creation/deployment action shown by Render.
2. Watch the build and runtime logs.
3. Confirm dependency installation and TypeScript compilation succeed.
4. Confirm the compiled server starts and the service reaches its healthy/live state.
5. Copy the service's public HTTPS URL.

Example URL shape:

```text
https://YOUR_RENDER_SERVICE.onrender.com
```

**Expected result:** a running Node Web Service with the intended text/Live models configured. A successful build alone does not prove runtime configuration or Gemini access.

### 6. Verify the deployed health endpoint

Replace the placeholder before running:

```bash
curl -i https://YOUR_RENDER_SERVICE.onrender.com/api/health
```

Expected status: **HTTP 200**. Expected JSON body:

```json
{"status":"ok","service":"aichatbot-gemini-backend"}
```

Opening the service root `/` may show a 404 because this is an API service. Test **`/api/health`**, rather than expecting the frontend at the Backend URL.

### 7. Verify a real text request

For the currently documented `/api/chat` contract:

```bash
curl -i https://YOUR_RENDER_SERVICE.onrender.com/api/chat \
  -H 'Content-Type: application/json' \
  --data-raw '{"messages":[{"role":"user","content":"Reply with exactly: pong"}]}'
```

**Expected result:** HTTP `200` and JSON containing a real `reply`. Exact generated wording may vary. If authentication or another access control has since been added, use its supported test method rather than disabling it.

If a request fails, inspect Render's runtime logs. Distinguish application startup, access-control, CORS, and upstream Gemini errors. A Gemini 429 is not proof that the deployment itself failed.

### 8. Account for Free-instance behavior

A Render Free Web Service sleeps after **15 minutes without inbound traffic**. Its next request wakes it, which can take about a minute. Allow for this when testing the first request after inactivity.

Free services also have monthly compute, bandwidth, and build allowances. Review the workspace's usage and payment settings; selecting Free compute does not make every possible usage category unlimited. Do not add keep-alive traffic solely to prevent sleep.

### 9. Deploy later Backend updates

1. Verify the change locally.
2. Push the reviewed revision to the connected branch.
3. If auto-deploy is enabled, Render deploys matching changes automatically. Otherwise, use the service's **Manual Deploy** action.
4. Confirm build/runtime success and retest `/api/health`.
5. Retest text and Live behavior when their code or configuration changes.

With Root Directory set to `Backend`, changes confined to Frontend normally do not trigger Backend auto-deployment. Frontend publishing remains a separate action.

## Section 2: Deploy Frontend on Firebase Hosting

### 1. Verify the Firebase CLI

```bash
firebase.cmd --version
```

The CLI was already installed during setup. If the command is unavailable, install it and verify again:

```bash
npm.cmd install -g firebase-tools
firebase.cmd --version
```

Sign in using the Google Account that manages **aichatbot-gemini**:

```bash
firebase.cmd login
```

CLI login authorizes deployment; it is separate from application-user sign-in.

### 2. Configure the production Backend URL

Keep the local development URL in **`Frontend/.env.local`**:

```dotenv
VITE_API_BASE_URL=http://localhost:3001
```

Create or update **`Frontend/.env.production.local`** with the deployed Backend URL:

```dotenv
VITE_API_BASE_URL=https://YOUR_RENDER_SERVICE.onrender.com
```

Replace `YOUR_RENDER_SERVICE` with the actual Render hostname. Use the Backend base URL only, without `/api/chat` or a trailing slash. Keep the existing four Firebase Web configuration values in the frontend environment; do not remove them.

Vite loads `.env.local` as well as production-specific files during `npm run build`. The production-specific API URL overrides the local development value, while existing Firebase values remain available unless overridden. Keep these real local files excluded from Git.

Check for conflicting process variables or production-mode environment files. Vite's `VITE_*` values are included in the browser bundle: **never add `GEMINI_API_KEY` to them**.

**Expected result:** local development uses port `3001`, while the production build calls the deployed HTTPS Backend. Changing an environment file after building does not update files already built or published.

### 3. Build the production frontend

```bash
cd /d/AIChatbot-Gemini/Frontend
npm.cmd ci
npm.cmd run lint
npm.cmd run build
```

Inspect each result. Continue only after the checks succeed.

**Expected result:** Vite creates **`Frontend/dist/index.html`** and its asset files, unless the project explicitly configures another output directory.

### 4. Locate the existing Hosting configuration

Before running initialization, check whether **`firebase.json`** and **`.firebaserc`** already exist at the repository root or inside Frontend. Reuse the existing configuration location rather than creating a competing second Hosting setup.

| Configuration location | Hosting `public` value | Directory for Firebase deploy commands |
| --- | --- | --- |
| `D:\AIChatbot-Gemini\firebase.json` | `Frontend/dist` | `D:\AIChatbot-Gemini` |
| `D:\AIChatbot-Gemini\Frontend\firebase.json` | `dist` | `D:\AIChatbot-Gemini\Frontend` |

The remaining command examples use **repository-root configuration**. If configuration already lives in Frontend, use that directory and `public: "dist"` instead.

### 5. Initialize standard Hosting if needed

If Hosting is already configured, review it and skip initialization. Otherwise, run from the repository root:

```bash
cd /d/AIChatbot-Gemini
firebase.cmd init hosting --project aichatbot-gemini
```

Use these answers when prompted:

| Prompt | Answer |
| --- | --- |
| Project | Existing project **aichatbot-gemini** |
| Public directory | **Frontend/dist** for repository-root configuration |
| Configure as a single-page app / rewrite all URLs to `index.html` | **Yes** |
| Automatic builds/deploys with GitHub | **No** for this manual deployment workflow |
| Overwrite the built `index.html`, if asked | **No** |

Use **Hosting**, not App Hosting. Preserve unrelated existing project configuration.

### 6. Verify the SPA rewrite

For a new repository-root setup, the Hosting portion of **`firebase.json`** should have this shape:

```json
{
  "hosting": {
    "public": "Frontend/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

For configuration inside Frontend, use **`"public": "dist"`**. Merge the relevant Hosting changes into existing configuration; do not replace the whole file blindly. Preserve specific rewrites or targets if the project already uses them.

The SPA fallback allows direct navigation and browser refresh on application routes such as `/chat`, `/settings`, and the actual Live route used by the router.

### 7. Publish the frontend

After a successful build, run from the directory containing the intended Hosting configuration:

```bash
cd /d/AIChatbot-Gemini
firebase.cmd deploy --only hosting --project aichatbot-gemini
```

If configuration is inside Frontend instead:

```bash
cd /d/AIChatbot-Gemini/Frontend
firebase.cmd deploy --only hosting --project aichatbot-gemini
```

Use the command matching the existing configuration, not both.

**Expected result:** deployment succeeds and the CLI prints the Hosting URL. The expected default project URL is:

```text
https://aichatbot-gemini.web.app
```

Use the actual URL printed by the CLI. `--only hosting` publishes the built frontend; it does not deploy the Node service to Render.

### 8. Verify domains and Backend CORS

1. Open the published URL in a browser.
2. Ensure the exact frontend origin is allowed by Backend's **`CORS_ALLOWED_ORIGINS`** on Render.
3. If the hostname differs from the planned value, update the Backend environment and redeploy it.
4. In Firebase Console, open **Authentication → Settings → Authorized domains**.
5. Confirm the website hostname used for Google sign-in is listed. Add it if missing; authorized-domain entries contain the hostname only, without `https://`, ports, or paths.

Firebase Authentication's authorized domains and Backend CORS are separate settings. Correcting one does not configure the other.

### 9. Test the published application

1. Open Sign-in, Chat, Settings, and Live using their actual application routes.
2. Refresh nested routes to confirm the SPA rewrite works.
3. Verify Google sign-in and sign-out on the published hostname.
4. Send a short message and confirm a real reply.
5. Ask a follow-up question to confirm conversation context.
6. Start Live, grant microphone access, and verify real audio input/output.
7. Test mute, captions, interruption, and ending Live. Confirm microphone use stops after leaving the page.
8. Switch Light, Dark, and System themes and verify the selected behavior across navigation and reload.
9. Open the HTTPS site on a real phone and tablet where available; check portrait/landscape layouts, touch controls, and microphone behavior.
10. In DevTools **Network**, confirm application API requests use the Render HTTPS hostname, not `localhost:3001`.

Firebase Hosting provides HTTPS by default. Use HTTPS when testing microphone access on devices. Browser viewport emulation verifies layout but does not replace a real-device audio test.

If an API call fails, inspect its status/JSON response and Render logs. Do not treat every failure as CORS: startup delay, request validation, access controls, and upstream Gemini errors have different causes.

### 10. Publish later frontend updates

Build and check the new revision:

```bash
cd /d/AIChatbot-Gemini/Frontend
npm.cmd run lint
npm.cmd run build
```

After success, deploy from the existing Hosting configuration directory. For repository-root configuration:

```bash
cd /d/AIChatbot-Gemini
firebase.cmd deploy --only hosting --project aichatbot-gemini
```

Rebuild whenever production `VITE_*` values change. Recheck the published application after each release.

### Official references

- [Render: Deploy a Node Express App](https://render.com/docs/deploy-node-express-app)
- [Render: Web Services](https://render.com/docs/web-services)
- [Render: Monorepo Support](https://render.com/docs/monorepo-support)
- [Render: Environment Variables](https://render.com/docs/configure-environment-variables)
- [Render: Free Web Services and usage limits](https://render.com/docs/free)
- [Firebase Hosting quickstart](https://firebase.google.com/docs/hosting/quickstart)
- [Firebase Hosting configuration and rewrites](https://firebase.google.com/docs/hosting/full-config)
- [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- [Vite environment variables and modes](https://vite.dev/guide/env-and-mode)

Platform documentation was checked on **20 October 2026**. Dashboard wording may change; use the actual service URL, repository layout, and configuration shown in the project.
