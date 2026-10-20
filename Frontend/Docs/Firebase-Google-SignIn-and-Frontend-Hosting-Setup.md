# Firebase Google Sign-in and Frontend Hosting Setup

Project: **AIChatbot-Gemini**  
Firebase project ID: **aichatbot-gemini**  
Local project folder: **D:\AIChatbot-Gemini**  
Guide date: **13 October 2026**

## Purpose and deployment scope

This guide covers two separate tasks:

1. Obtain four Firebase Web app configuration values and configure Firebase Authentication for Google sign-in.
2. Install and use the Firebase CLI to deploy **only the React + TypeScript + Vite frontend** to **Firebase Hosting**.

The agreed deployment plan is:

| Component | Service |
| --- | --- |
| Frontend | Firebase Hosting |
| Google account authentication | Firebase Authentication |
| Persistent chat history, when implemented | Cloud Firestore |
| Backend and Gemini API integration | Render |

Keep the Firebase project on the **Spark** plan. Use standard **Firebase Hosting**, not Firebase App Hosting. This guide does not deploy backend code, Cloud Functions, Firestore rules, or Gemini integration.

The `.cmd` commands below are for **Windows**, including the Git Bash terminal used in this project. On macOS or Linux, use `npm` and `firebase` without `.cmd`.

## 1. Obtain the four Firebase configuration values

### Step 1: Open General settings

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Select **AIChatbot-Gemini**.
3. Open **Settings → Project settings → General**.
4. Scroll down to **Your apps**.

This is the General tab, not Cloud Messaging. The Cloud Messaging Sender ID and Web Push key pair are not the configuration values needed here.

### Step 2: Register a Web app

If Your apps shows **There are no apps in your project**:

1. Click the **`</>` Web icon**, the third icon after iOS and Android in the observed console.
2. Enter the app nickname **AIChatbot-Gemini-Web**.
3. Select **Also set up Firebase Hosting for this app**, matching the chosen frontend hosting plan.
4. Complete any additional Hosting selection shown by the console, then click **Register app**.

Choose **Web** even when testing the website in a mobile browser. Android and iOS registration are for native application integrations.

If a Web app is already registered, select it instead of creating another app. In **SDK setup and configuration**, select **Config** to view its configuration again.

### Step 3: Read the Firebase config

After registration, the **Add Firebase SDK** step displays a `firebaseConfig` object. Keep **Use npm** selected for this Vite project.

Copy these four values from the **same Web app**:

| Firebase config property | Environment variable | Meaning |
| --- | --- | --- |
| `apiKey` | `VITE_FIREBASE_API_KEY` | Identifies the Firebase project for client API requests. |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` | Authentication domain used by Firebase's browser sign-in flow. |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` | Identifies the Firebase project. |
| `appId` | `VITE_FIREBASE_APP_ID` | Identifies this registered Firebase Web app. |

For the project's current environment template, `storageBucket` and `messagingSenderId` are not required. Do not confuse `appId` with the project name or project number.

### Step 4: Fill `.env.local`

Open **D:\AIChatbot-Gemini\.env.local** and add the four values. Replace every `PASTE_...` placeholder with the corresponding value copied from Firebase:

```dotenv
VITE_FIREBASE_API_KEY=PASTE_API_KEY_FROM_FIREBASE
VITE_FIREBASE_AUTH_DOMAIN=PASTE_AUTH_DOMAIN_FROM_FIREBASE
VITE_FIREBASE_PROJECT_ID=PASTE_PROJECT_ID_FROM_FIREBASE
VITE_FIREBASE_APP_ID=PASTE_APP_ID_FROM_FIREBASE

# Optional: leave empty when using real Google sign-in.
VITE_FIREBASE_AUTH_EMULATOR_URL=
```

Copy the value inside the console's quotation marks; do not copy commas or the entire JavaScript object. Save the file.

The supplied project setup guide says the Firebase SDK and initialization code are already prepared. There is no need to paste `initializeApp(...)` into the project again or reinstall the SDK solely because the console shows its example.

Vite loads `.env.local` when starting the dev server and building the app. Restart the dev server after changing it, and rebuild before deploying. Check for conflicting values in mode-specific files such as `.env.production`.

```bash
# Stop an existing dev server with Ctrl+C first, then restart it.
npm.cmd run dev
```

Firebase Web config is client configuration, not the Gemini API key. A future Gemini secret belongs in the backend on Render, not in a `VITE_*` variable.

### Step 5: Enable Google sign-in

**The four values connect the app to Firebase; they do not enable Google sign-in by themselves.** The application also needs Firebase Auth code, an enabled Google provider, and authorized domains.

1. Return to the Firebase console using **Continue to console** when available. Hosting deployment can be completed separately.
2. Open **Security → Authentication**. Some console layouts group Authentication under Build instead.
3. Click **Get started** if Authentication has not been initialized.
4. Open **Sign-in method** and select **Google**.
5. Turn on **Enable**, select the project support email if requested, and click **Save**.

### Step 6: Set authorized domains

1. In Authentication, open **Settings → Authorized domains**.
2. Add **localhost** for local testing if it is missing. New Firebase projects created after 28 April 2025 do not receive this entry automatically.
3. If testing at `http://127.0.0.1:5173`, also authorize **127.0.0.1**.
4. After choosing the deployed website hostname, verify it is listed. For the default Hosting site shown in this project's wizard, check **aichatbot-gemini.web.app**. Check **aichatbot-gemini.firebaseapp.com** too if you use that URL.
5. Enter hostnames only, without a scheme, port, or path. Do not add duplicate entries.

### Step 7: Verify Google sign-in

1. Restart the local dev server after saving `.env.local`.
2. Open the local URL displayed by Vite.
3. Click **Continue with Google** and complete account selection.
4. Verify that the app opens Chat and that Settings shows the actual signed-in name and email.
5. Test Log out, then repeat the sign-in check on the deployed website after Hosting deployment.

`VITE_FIREBASE_AUTH_EMULATOR_URL` is for Firebase Authentication emulation, not mobile-device emulation. Real Google sign-in does not need an emulator URL. Leave it empty; omit it only if the application's configuration handling accepts a missing value. The implementation of that missing-value behavior has not been inspected in this conversation.

## 2. Install the Firebase CLI

### Step 1: Open the project terminal

Open a terminal in VS Code. For Git Bash on Windows, navigate to the project with:

```bash
cd /d/AIChatbot-Gemini
```

### Step 2: Install the CLI globally

```bash
npm.cmd install -g firebase-tools
```

- `npm.cmd`: the Windows npm launcher.
- `install`: installs a package.
- `-g`: makes the command-line tool available globally rather than adding it as a project dependency.
- `firebase-tools`: the package containing the Firebase CLI.

The CLI is a deployment and management tool. It is separate from the `firebase` JavaScript SDK used by the app for authentication.

### Step 3: Verify installation

```bash
firebase.cmd --version
```

This prints the installed Firebase CLI version. The user verified **15.33.0** during this setup; a later installation may show a different version.

## 3. Understand login, init and deploy

| Generic command shown in Firebase Console | Meaning | Recommended Windows command for this guide |
| --- | --- | --- |
| `firebase login` | Signs the CLI in as the developer who manages the Firebase project. It does not sign a user into the chatbot. | `firebase.cmd login` |
| `firebase init` | Configures the local directory for selected Firebase services and associates it with a Firebase project. It does not publish the website. | `firebase.cmd init hosting --project aichatbot-gemini` |
| `firebase deploy` | Deploys all configured deployable resources unless restricted. It is not a frontend-only command by default. | `firebase.cmd deploy --only hosting --project aichatbot-gemini` |

Use the Hosting-specific commands to keep this deployment limited to the frontend.

## 4. Configure and deploy only the frontend

### Step 1: Sign in to the CLI

```bash
firebase.cmd login
```

Choose the Google account that manages **AIChatbot-Gemini** in the browser and complete the CLI authorization. A successful login reports `Success! Logged in as ...` in the terminal.

### Step 2: Build the React app

```bash
npm.cmd run build
```

Vite's default output directory is **dist**. Confirm that **dist/index.html** exists and that the build passed. If `vite.config.ts` overrides `build.outDir`, use that actual output directory instead.

The build uses the environment values available on the machine performing the build. Firebase Hosting serves the resulting static files; it does not run Vite or load `.env.local` at runtime.

### Step 3: Initialize standard Hosting

Before initialization, inspect any existing `firebase.json` and `.firebaserc`. The project may already have emulator settings. Keep those settings and review changes rather than replacing the entire file with a Hosting-only example. Re-running init can reset the corresponding service configuration.

```bash
firebase.cmd init hosting --project aichatbot-gemini
```

Use these answers when the corresponding prompts appear:

| Prompt | Answer for this React + Vite frontend |
| --- | --- |
| Project selection, if requested | Use the existing project **aichatbot-gemini**. |
| Public directory | **dist**, unless the build output was customized. |
| Configure as a single-page app / rewrite URLs to index.html | **Yes**, to support routes such as `/chat` and `/settings`. |
| Set up automatic builds and deploys with GitHub | **No** for the initial manual deployment. |
| Overwrite `dist/index.html`, if requested | **No**; keep the React build's file. |

Initialize **Hosting**, not App Hosting or Functions. Inspect the generated configuration and ensure Hosting serves the build output with an SPA rewrite. Preserve unrelated existing configuration.

### Step 4: Deploy the built frontend

```bash
firebase.cmd deploy --only hosting --project aichatbot-gemini
```

This publishes the configured frontend files to Firebase Hosting. It does not deploy the Render backend or modify Firestore rules. If configuration includes several Hosting sites, inspect the targets before running it.

After success, open the **Hosting URL printed by the CLI**. The wizard showed the expected default site URL as:

```text
https://aichatbot-gemini.web.app
```

Test Sign-in, Chat and Settings, and refresh a nested route such as `/settings` to verify the SPA rewrite.

### Step 5: Publish later frontend updates

From the project directory, build first. Run deploy only if the build succeeds:

```bash
npm.cmd run build
```

```bash
firebase.cmd deploy --only hosting --project aichatbot-gemini
```

No Firebase backend deployment is part of these commands. Backend hosting remains on Render under the agreed plan.

## 5. Status at the time this guide was requested

| Item | Confirmed status from this conversation |
| --- | --- |
| Three frontend pages | User reported Sign-in, Chat and Settings complete. |
| Firebase Web app | Registered; the console displayed its configuration. |
| Four environment values | User reported adding them to `.env.local`. |
| Firebase CLI | Installed; `firebase.cmd --version` returned **15.33.0**. |
| CLI login | Instructions supplied; success not yet reported. |
| Google provider and authorized domains | Completion not yet confirmed. |
| Hosting initialization and deployment | Completion not yet confirmed. |
| Real Google sign-in | Successful end-to-end test not yet confirmed. |
| Gemini API connection | Not covered by this guide. |

These instructions do not imply that unconfirmed steps have already been completed.

## 6. Configure Firebase Authentication for Google sign-in

### Why this setup is required

The four Firebase Web configuration values identify the Firebase project and Web app. **They do not enable Google sign-in by themselves.** Firebase Authentication must be initialized, and Google must be enabled as a sign-in provider so the application can authenticate users with their Google Accounts.

With the existing frontend Firebase Auth implementation, this configuration allows the app to complete Google account sign-in, obtain the signed-in user's identity, and open the Chat page. Authentication identifies the user; storing chat history in Firestore and connecting Gemini are separate tasks.

The steps below expand the brief Authentication instructions in Section 1 and follow the Firebase Console screens used for this project.

### Step 1: Open Authentication

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Select **AIChatbot-Gemini**, with project ID **aichatbot-gemini**.
3. Open **Authentication** from the left sidebar. In the observed console, it appears under **Project shortcuts**; it can also be accessed through the **Security** product category. Some console layouts group it under Build.

**Expected screen:** the Authentication introduction page if the service has not yet been initialized, or its existing management tabs if it has.

### Step 2: Initialize Authentication

1. On the Authentication introduction page, click **Get started**.
2. The console opens the **Sign-in method** tab and displays the available sign-in providers.

If Authentication is already initialized, go directly to **Sign-in method**.

### Step 3: Select Google

1. In **Sign-in providers**, find **Additional providers**.
2. Click **Google**.
3. If a provider list is already present, open the Google row; if Google is absent, use **Add new provider** and select Google.

**Expected screen:** the Google provider configuration panel with an **Enable** switch.

### Step 4: Turn on Enable

1. Turn on **Enable** at the upper-right corner of the Google configuration panel.
2. A project-level settings section appears with **Public-facing name for project** and **Support email for project**.

The **SHA-1 release fingerprint** notice applies to native Android apps. This React website does not require an Android fingerprint for its browser sign-in flow, including when opened in a mobile browser.

### Step 5: Set the public-facing name and support email

| Field | What to enter | Purpose |
| --- | --- | --- |
| **Public-facing name for project** | The app's public name. The name entered during this setup was **AI Chatbot by Gemini**. | The app name intended to be shown to users during Google sign-in and consent. It is separate from the Firebase project ID. |
| **Support email for project** | Select your own available email address from the dropdown. | Provides the contact address for users who have questions about the app's sign-in or authorization. |

The public-facing name can be changed later; see Section 7. Google may show the application's domain instead of its app name until the branding is verified and published.

For the standard Firebase Google provider setup used here:

- Leave **Safelist client IDs from external projects (optional)** empty.
- Leave **Web SDK configuration**, including **Web client ID** and **Web client secret**, at the console's defaults. This setup did not involve supplying custom OAuth credentials manually.

### Step 6: Save and confirm the provider

1. Scroll to the bottom of the Google configuration panel.
2. Click **Save**.
3. Wait for the console to return to the **Sign-in providers** list.
4. Confirm that **Google** has the status **Enabled**.

This completes the provider configuration. The four Firebase Web values in `.env.local` remain the frontend configuration; no Google client secret needs to be added to that file for this flow.

### Step 7: Test the application

1. Open the running frontend at **http://localhost:5173**, or the local URL printed by Vite if a different port is in use.
2. Click **Continue with Google**.
3. Select a Google Account in the popup and complete any prompts.
4. Confirm that the application opens **/chat** and displays the signed-in user's name in the sidebar.
5. Open Settings to check the account information, then test Log out.

Refer to **Section 1, Step 6** for authorized-domain configuration when using another local hostname or a deployed website. Successful local sign-in does not confirm sign-in on a future deployment.

On **14 October 2026**, the Google provider was shown as **Enabled**, and the user confirmed successful Google Account sign-in and access to the local Chat page. Settings and Log out checks are verification steps above, not claimed completed checks. The status table in Section 5 records the earlier checkpoint when the original guide was requested.

## 7. Change the app name later

### Step 1: Open the correct Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Select the project associated with Firebase project ID **aichatbot-gemini**.

### Step 2: Edit the OAuth app name

1. Open **Google Auth Platform → Branding**.
2. In **App Information**, find **App name**.
3. Enter the new public app name and save the changes.

**The app name can be changed later through Google Cloud Console → Google Auth Platform → Branding → App name. Displaying the new name on the Google consent screen may require branding verification and publication first.**

### Step 3: Verify and publish branding when required

1. Review the branding status shown by Google Auth Platform.
2. If verification is required, follow the **Verify Branding** process.
3. After approval, use **Publish branding** when offered to make the updated branding visible to users.

Saving a draft does not necessarily change the name users immediately see. Google distinguishes draft branding from published branding; before branding is verified and published, users may see the application domain, such as **aichatbot-gemini.firebaseapp.com**, instead of the app name.

### Step 4: Update the website's own name separately

If the website is being renamed as well, update its visible branding and browser-tab title in the frontend, then rebuild and deploy it. Changing the OAuth app name does not automatically rename the React interface, the Firebase project ID, or the Hosting domain.

## Official references

- [Firebase Web setup](https://firebase.google.com/docs/web/setup)
- [Firebase API keys and Web configuration](https://firebase.google.com/docs/projects/api-keys)
- [Google sign-in with Firebase Authentication](https://firebase.google.com/docs/auth/web/google-signin)
- [Authentication FAQ and troubleshooting](https://firebase.google.com/docs/auth/faq-and-troubleshooting)
- [Firebase CLI reference](https://firebase.google.com/docs/cli)
- [Firebase Hosting quickstart](https://firebase.google.com/docs/hosting/quickstart)
- [Firebase Hosting quotas and pricing](https://firebase.google.com/docs/hosting/usage-quotas-pricing)
- [Vite environment variables](https://vite.dev/guide/env-and-mode)
- [Vite production builds](https://vite.dev/guide/build)
- [Manage OAuth app branding](https://support.google.com/cloud/answer/15549049?hl=en)
