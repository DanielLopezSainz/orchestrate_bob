# IBM Watsonx Orchestrate UI Template

## Project Overview
This project is a modular, template-ready web application designed to serve as the frontend and secure proxy backend for **IBM Watsonx Orchestrate** agents. 

The primary goal of this repository is to act as a **reusable template**. It is built to be easily deployed across different customers and use cases with minimal code changes. The application utilizes the **IBM Carbon Design System** for its visual language and supports dynamic, configuration-driven theming.

## Architectural Goals
1. **Separation of Concerns:** Strict isolation between visual components, state logic, session memory, and external API integration.
2. **Template Reusability:** UI colors, text, and branding are controlled via a central JSON configuration, completely independent of the React component logic.
3. **Secure Conversational Memory:** The Thread ID (which gives the Watsonx agent its memory) is safely managed by the backend session layer to survive browser refreshes and OIDC redirects.
4. **Streaming Native:** Built from the ground up to handle Server-Sent Events (SSE) to provide real-time, typewriter-effect responses from the AI.
5. **Unified Deployment:** The frontend compiles directly into the backend's static directory, allowing a single Docker container to serve the entire application on platforms like IBM Code Engine.

---

## Architecture & Layer Components

The application is divided into heavily abstracted layers. **🤖 AI AGENT DIRECTIVE:** When modifying this codebase, you must respect these boundaries. Do not mix layer responsibilities.

### 1. Security & Authorization Layer (Backend)
* **File:** `backend/src/middleware/auth.js`
* **File:** `backend/src/server.js`
* **Role:** Manages the OpenID Connect (OIDC) authentication flow (via Passport.js). Protects API endpoints and verifies that the authenticated user's email exists on the approved environment allowlist.

### 2. Session State Layer (Backend)
* **File:** `backend/src/server.js` (express-session configuration)
* **Role:** Acts as the Single Source of Truth for the Watsonx `threadId`. It ensures the conversational context is bound to the user's secure cookie, preventing "amnesia" if the React app reloads.

### 3. External API Integration Layer (Backend)
* **File:** `backend/src/clients/ibmClient.js`
* **File:** `backend/src/services/iam.js`
* **Role:** Manages IBM Cloud IAM token fetching, caching, and expiration buffers. Proxies the incoming prompt to the Watsonx Orchestrate API.
* **🤖 AI AGENT DIRECTIVE:** The `streamChat` function must *only* return the raw fetch Promise. Do not await `.json()` or `.text()`, as this breaks the SSE streaming pipeline.

### 4. State & Logic Layer (Frontend)
* **File:** `frontend/src/hooks/useChat.js`
* **Role:** The engine of the frontend. It manages the chat array, parses incoming Server-Sent Events (buffering incomplete chunks), extracts the `thread_id` from the Watsonx JSON payload, and syncs it back to the backend session.

### 5. Presentation & Theming Layer (Frontend)
* **File:** `frontend/src/config.json` (Central theme configuration)
* **File:** `frontend/src/App.scss` (Template CSS using CSS Variables)
* **Files:** `frontend/src/components/*.jsx`
* **Role:** "Dumb" components built with `@carbon/react`. They do not fetch data. They simply render the state provided by `useChat.js` and consume the colors/text defined in `config.json`.

---

## Customization Guide (For Developers & AI Agents)

Because this is a template, most customizations should require minimal effort. Here are examples of how to modify the application for a new customer deployment:

### Scenario A: Changing the UI Theme and Branding
**Goal:** Deploy the app for "Customer X" who wants a red theme and a custom assistant name.
**Action:** 1. Do not modify React components.
2. Open `frontend/src/config.json`.
3. Update `app.headerTitle` to "Customer X Orchestrate".
4. Update `app.assistantName` to "Support Bot".
5. Update `theme.userBubbleBackground` to `#da1e28` (Carbon Red 60).
6. Rebuild the frontend (`npm run build`).

### Scenario B: Migrating to a different Identity Provider (e.g., Microsoft Entra ID)
**Goal:** Move away from IBM App ID to a standard corporate Microsoft Entra OIDC login.
**Action:**
1. Update the `.env` file with the new `OIDC_DISCOVERY_URL`, `OIDC_CLIENT_ID`, and `OIDC_CLIENT_SECRET`. The `openid-client` library in `server.js` will automatically adapt to the new discovery document.
2. Open `backend/src/middleware/auth.js`.
3. Inspect the new ID Token payload structure. If Microsoft uses a different key for the user's email (e.g., `upn` or `mail`), update the extraction logic:
   ```javascript
   // Change from:
   const userEmail = req.user.email || req.user.preferred_username;
   // To:
   const userEmail = req.user.email || req.user.preferred_username || req.user.upn;

### Scenario C: Customizing the Chat Layout Structure
**Goal:** A UI designer has provided a totally new HTML/CSS layout for the chat interface that differs structurally from the default Carbon layout.
**Action:**

You may replace the JSX inside MessageList.jsx and ChatInput.jsx with the designer's HTML/React export.

Constraint: You must continue to map the messages array from useChat.js to the new layout. Do not move the fetch() logic into the new UI components.

### Deployment
This application is designed to be deployed as a single Docker container.

The Dockerfile uses a multi-stage build.

* **Stage 1:** compiles the Vite React app.

* **Stage 2:** copies the compiled assets directly into the Express backend's public directory.

Express serves the static UI and hosts the secure /api and /auth endpoints on the same port (default 8080).



🤖 AI AGENT DIRECTIVE: Do not alter the outDir in vite.config.js or the static asset routing in server.js without updating the COPY directives in the Dockerfile.