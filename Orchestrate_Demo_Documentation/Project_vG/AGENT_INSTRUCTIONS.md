# AI AGENT DIRECTIVES FOR WATSONX TEMPLATE

You are an expert Enterprise Software Architect and Full-Stack Developer. 
You are assisting in the development and maintenance of a modular template repository for IBM Watsonx Orchestrate. 

**CRITICAL DIRECTIVE:** Read this entire document before analyzing the codebase, writing code, or suggesting modifications. You must adhere to these architectural boundaries at all times to prevent breaking the Server-Sent Events (SSE) stream or the deployment pipeline.

---

## 1. Project Context & Goals
This project is a custom, template-ready web frontend and secure backend proxy for **IBM Watsonx Orchestrate** agents. 
- **The Goal:** To provide a white-labeled, highly styled chat interface using the IBM Carbon Design System that can be easily customized for different clients via configuration files, rather than code rewrites.
- **The Tech Stack:** React 19 (Vite), Node.js 20+ (Express), OpenID Connect (OIDC) via Passport.js, and IBM Carbon Design System (SCSS).

---

## 2. Environment Variables Dictionary
When configuring this application, these variables MUST be present in the backend environment. 
**AI AGENT DIRECTIVE:** Do NOT introduce new environment variables for UI branding (colors, titles, etc.); you must use `frontend/src/config.json` for all presentation configuration.

* **Watsonx & IAM Integration:**
  * `API_KEY`: IBM Cloud API Key used to generate IAM bearer tokens.
  * `ORCHESTRATE_INSTANCE_URL`: The base REST URL for the Watsonx environment.
  * `AGENT_ID`: The specific UUID of the Watsonx agent to route chats to.
* **OIDC Authentication (Passport.js):**
  * `OIDC_DISCOVERY_URL`: The well-known configuration endpoint for the IDP (e.g., IBM App ID, Microsoft Entra).
  * `OIDC_CLIENT_ID`: The application's registered client ID.
  * `OIDC_CLIENT_SECRET`: The application's registered client secret.
  * `OIDC_REDIRECT_URI`: The authorized callback URL (e.g., `https://<app-url>/auth/callback`).
* **Authorization & Security:**
  * `ALLOWED_USERS`: A comma-separated list of emails/UPNs allowed to access the app (Evaluated in `auth.js`).
  * `SESSION_SECRET`: Cryptographic string used by `express-session` to sign the session ID cookie.
* **Server Configuration:**
  * `PORT`: The port the Express server listens on (defaults to 8080).
  * `NODE_ENV`: Evaluated to enable secure HTTPS cookies in production.

---

## 3. Build, Docker, and Code Engine Deployment
This app is designed to run as a **single unified container** on serverless platforms like IBM Code Engine.
- **Multi-Stage Build (`Dockerfile`):** Stage 1 builds the Vite React app. Stage 2 copies those static assets into the Node.js backend container.
- **Path Synchronization:** Vite (`vite.config.js`) outputs to `../backend/public`. Express (`server.js`) serves static files from `../public`. 
- **AI AGENT DIRECTIVE:** Do not suggest adding an NGINX container or separating the frontend and backend into two deployments. Do not alter the `outDir` in `vite.config.js` without updating the `Dockerfile` COPY commands and the Express static routes.

---

## 4. The Watsonx Orchestrate Data Flow
We do NOT connect the React frontend directly to IBM. We use a secure backend proxy pattern.
1. **Input:** User types a message in React (`ChatInput.jsx`).
2. **Hook:** `useChat.js` POSTs the message to `/api/chat`.
3. **Session:** `server.js` verifies the user and retrieves the `threadId` from `req.session`.
4. **Auth:** `iam.js` retrieves a cached IBM Cloud IAM token.
5. **Proxy:** `ibmClient.js` forwards the prompt and token to Watsonx with `stream: true`.
6. **Streaming:** Watsonx returns an SSE stream. Express pipes it directly back to React.
7. **Parsing:** `useChat.js` reads chunks, buffers them, extracts `data.thread_id` from the JSON payload, and updates the UI.

---

## 5. LAYER BOUNDARIES & MODIFICATION SOPs

You must respect the separation of concerns. Below are the rules for modifying each layer, what is forbidden, and examples of correct modifications.

### Layer A: Presentation & Theming Layer (`frontend/src/components/*`, `config.json`, `App.scss`)
* **Role:** Render the UI using the IBM Carbon Design System.
* **What you CAN modify:** JSX structures, Carbon component props, CSS variables, and the `config.json` file.
* **What you CANNOT modify:** You must NEVER add `fetch()` calls, business logic, or complex state management to these files. NEVER hardcode hex colors or client names in `.jsx` or `.scss` files.
* **Example Modification:** * *Request:* "Change the user chat bubble color to red and the title to 'Support Bot'."
  * *Correct Action:* Update `"userBubbleBackground": "#da1e28"` and `"headerTitle": "Support Bot"` inside `frontend/src/config.json` ONLY.

### Layer B: State & Logic Layer (`frontend/src/hooks/useChat.js`)
* **Role:** Manage communication with the backend and parse the SSE stream.
* **What you CAN modify:** Loading states, error handling strings, or parsing additional custom metadata out of the Watsonx JSON payload.
* **What you CANNOT modify:** You must NEVER remove the string buffering logic (`buffer += decoder.decode...`). TCP streams split JSON payloads arbitrarily; parsing unbuffered chunks will crash the app. You must NEVER attempt to extract the `threadId` from HTTP headers; it only exists inside the streaming JSON payload.
* **Example Modification:**
  * *Request:* "Add a feature to track if the agent has finished typing."
  * *Correct Action:* Add a boolean `isTyping` state to `useChat.js`, set it to true on fetch, and set it to false when the `[DONE]` signal is received in the stream parser.

### Layer C: Security & Session Layer (`backend/src/server.js`, `backend/src/middleware/auth.js`)
* **Role:** Protect routes and maintain the user's conversational memory across page reloads.
* **What you CAN modify:** The `protect` middleware to support different OIDC token schemas, or tweaking the `express-session` cookie max-age.
* **What you CANNOT modify:** You must NEVER rely on the React frontend to permanently store the `threadId`. The backend `express-session` is the Master Source of Truth for the Thread ID.
* **Example Modification:**
  * *Request:* "We are migrating from IBM App ID to Microsoft Entra. The allowlist isn't working."
  * *Correct Action:* Open `auth.js` and update the email extraction to check Microsoft's schema: `const userEmail = req.user.email || req.user.preferred_username || req.user.upn;`

### Layer D: External API Integration Layer (`backend/src/clients/ibmClient.js`, `backend/src/services/iam.js`)
* **Role:** Communicate securely with IBM Cloud.
* **What you CAN modify:** Adding new custom headers requested by Watsonx (e.g., `X-Watsonx-Client-IP`).
* **What you CANNOT modify:** In `ibmClient.js`, you must ONLY return the raw `fetch` promise. NEVER use `await response.json()` or `await response.text()`—this consumes the stream and destroys the SSE pipeline. In `iam.js`, you must NEVER bypass the `cachedToken` logic, or you will trigger IBM Cloud rate limiting.
* **Example Modification:**
  * *Request:* "Pass the user's ID to Watsonx for analytics."
  * *Correct Action:* Update `streamChat` to accept a `userId` parameter and append it to the `headers` object before returning the fetch promise.
