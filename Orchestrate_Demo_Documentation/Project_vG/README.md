# IBM Watsonx Orchestrate UI Template test edit from BOB

## Project Overview
This project is a modular, template-ready web application designed to serve as the frontend and secure proxy backend for **IBM Watsonx Orchestrate** agents. 

The primary goal of this repository is to act as a **reusable template**. It is built to be easily deployed across different customers and use cases with minimal code changes. The application utilizes the **IBM Carbon Design System** for its visual language and supports dynamic, configuration-driven theming.


Rather than building a rigid, single-use application, this project was developed with a strict **Template Philosophy**. It is engineered to be instantly redeployable for different enterprise customers and distinct Watsonx agents by simply updating configuration files and environment variables—all while maintaining enterprise-grade security and Server-Sent Event (SSE) streaming capabilities.

--- 

## 🎯 Design Philosophy & Goals

1. **Strict Separation of Concerns:** The codebase is heavily layered. UI components do not fetch data, API clients do not parse UI state, and the frontend is blissfully unaware of authentication secrets.
2. **Configuration-Driven Theming:** UI colors, typography, and branding text are decoupled from React components. A central `config.json` acts as the single source of truth for the application's visual identity.
3. **Secure Conversational Memory:** The application uses the Backend-for-Frontend (BFF) pattern. Conversational context (the Watsonx `thread_id`) is locked inside a secure backend `express-session`, preventing the AI from losing its memory when the user refreshes the browser or triggers an OIDC redirect.
4. **Streaming Native:** Built specifically to handle Server-Sent Events (SSE). It pipes the raw binary stream from Watsonx directly to the client browser to create a real-time, typewriter-effect response.
5. **Unified Cloud-Native Deployment:** Designed specifically for serverless container platforms like IBM Code Engine. It packages the compiled frontend and the Node.js API gateway into a single, high-performance Docker image.

---

## 🔄 How it Works: The Watsonx Integration Flow
Because we cannot expose IBM Cloud API keys directly to the browser, the application uses a secure backend proxy pattern. Here is the exact lifecycle of a chat message:

1. **Input:** The user types a message in the React UI (`ChatInput.jsx`).
2. **Hook Execution:** `useChat.js` dispatches the prompt via HTTP POST to our local Express server (`/api/chat`).
3. **Auth & Session Sync:** The Express server (`server.js`) verifies the user's OIDC session and retrieves the active `threadId` from `express-session` to ensure the agent remembers the context.
4. **IAM Authentication:** `iam.js` fetches (or retrieves from memory) a valid IBM Cloud IAM token.
5. **Watsonx Request:** `ibmClient.js` forwards the prompt, the IAM token, and the `X-IBM-THREAD-ID` to the Watsonx Orchestrate API. It strictly requests `stream: true`.
6. **Streaming Proxy:** Watsonx responds with an SSE stream. Express takes this raw stream and pipes it directly back to the React frontend without consuming it.
7. **Frontend Parsing:** `useChat.js` reads the chunks, utilizes a string buffer to reconstruct split JSON payloads, extracts the `thread_id` to sync back to the server, and incrementally updates the UI with the text delta.

---

## 🏗️ Architecture Layers & Customization Guide

To maintain the template's integrity, modifications must respect the established layer boundaries.

### 1. Presentation Layer (Frontend UI)
* **Components:** `frontend/src/components/*.jsx`
* **Theming:** `frontend/src/config.json` & `frontend/src/App.scss`
* **Role:** "Dumb" components built with the IBM Carbon Design System (`@carbon/react`). 
* **How to Modify:** * **To Change Branding:** Do not rewrite components. Open `config.json` and change the text/hex colors. The app dynamically injects these into `App.scss` as CSS Custom Properties.
  * **To Change Layout:** You may replace the JSX within the components to match a custom Figma design, but you must pass the `messages` array via props. **Never** add `fetch()` calls or business logic to these files.

### 2. State & Logic Layer (Frontend Hook)
* **Component:** `frontend/src/hooks/useChat.js`
* **Role:** The engine of the frontend. Manages the chat array, handles loading states, and executes the complex SSE buffer-and-parse logic.
* **How to Modify:**
  * You can safely add new state variables here (e.g., `const [isTyping, setIsTyping] = useState(false)`) and pass them down to the UI components.
  * **WARNING:** Never remove the string buffering logic (`buffer += decoder.decode...`). TCP streams arbitrarily split JSON payloads in transit. If you attempt to run `JSON.parse()` on unbuffered chunks, the application will crash.

### 3. Security & Session Layer (Backend Middleware)
* **Components:** `backend/src/server.js`, `backend/src/middleware/auth.js`
* **Role:** Manages OpenID Connect (OIDC) authentication via Passport.js, enforces allowlist authorization, and manages the secure `express-session`.
* **How to Modify:**
  * **To change Identity Providers (e.g., moving to Microsoft Entra ID):** Update the `OIDC_*` environment variables. Then, open `auth.js` and ensure the email extraction logic matches the new provider's token schema (e.g., checking `req.user.upn` instead of `req.user.email`).

### 4. External API Integration Layer (Backend Clients)
* **Components:** `backend/src/clients/ibmClient.js`, `backend/src/services/iam.js`
* **Role:** Generates IBM Cloud IAM tokens and communicates with the Watsonx REST API.
* **How to Modify:**
  * **To add custom tracking headers:** Modify the `headers` object inside `ibmClient.js`.
  * **WARNING:** In `ibmClient.js`, the `streamChat` function must **only** return the raw `fetch` promise. Do not `await response.json()`. Awaiting the response consumes the body and destroys the SSE streaming pipeline. Never bypass the IAM caching logic in `iam.js`, or the app will be rate-limited by IBM.

---

## ⚙️ Environment Variables

To run this application locally or deploy it to the cloud, configure the following environment variables in a `.env` file located in the `/backend` directory.

### Watsonx & IAM Configuration
| Variable | Description |
| :--- | :--- |
| `API_KEY` | Your IBM Cloud API Key (used to generate IAM Bearer tokens). |
| `ORCHESTRATE_INSTANCE_URL` | The base URL for your Watsonx instance (e.g., `https://api.watsonx.ai`). |
| `AGENT_ID` | The specific UUID of the Watsonx Orchestrate agent to route chats to. |

### Authentication (OIDC)
| Variable | Description |
| :--- | :--- |
| `OIDC_DISCOVERY_URL` | The well-known configuration endpoint for your IDP (e.g., IBM App ID or Entra). |
| `OIDC_CLIENT_ID` | The application's registered client ID. |
| `OIDC_CLIENT_SECRET` | The application's registered client secret. |
| `OIDC_REDIRECT_URI` | The authorized callback URL (e.g., `http://localhost:8080/auth/callback` for dev, or your real domain for prod). |

### Security & Server Config
| Variable | Description |
| :--- | :--- |
| `ALLOWED_USERS` | A comma-separated list of email addresses authorized to access the application. |
| `SESSION_SECRET` | A strong cryptographic string used to sign the secure session cookies. |
| `PORT` | The port the Express server listens on (Defaults to `8080`). |

---

## 🐳 Docker & Code Engine Deployment

This application is architected specifically for serverless container platforms like **IBM Code Engine**. To simplify networking, eliminate CORS complexities, and reduce cloud costs, it is packaged as a **Single Unified Container**.

### How the Multi-Stage Dockerfile Works:
1. **Stage 1 (Frontend Build):** The Dockerfile spins up a Node.js Alpine container, installs the frontend dependencies, and runs `vite build`. 
2. **Path Synchronization:** Vite is explicitly configured via `vite.config.js` to output the compiled, minified HTML/CSS/JS assets directly into a specific folder: `/app/backend/public`.
3. **Stage 2 (Backend Production):** A fresh, lightweight Node container is created. It installs *only* production dependencies for the backend. It then uses the `COPY --from=build-stage` command to pull the `/public` folder generated in Stage 1 into the backend directory.
4. **Unified Gateway:** The Express backend spins up on port `8080`. It intercepts `/api` and `/auth` routes natively, and acts as a static file server for anything else, thereby serving the React SPA.

**The Result:** You get a full-stack, authenticated application running in a single, easily deployable Docker image. You do not need to configure separate frontend and backend deployments, nor do you need to maintain an NGINX proxy container.

### Deployment Commands

```bash
# 1. Build the unified image
docker build -t watsonx-ui-template .

# 2. Run locally to test the production build (Make sure your .env is populated)
docker run -p 8080:8080 --env-file ./backend/.env watsonx-ui-template
