/**
 * backend/src/server.js
 * * ARCHITECTURE: MODULAR BACKEND GATEWAY
 * This server acts as a secure proxy between the React frontend and IBM Watsonx.
 * * CORE RESPONSIBILITIES (By AI Agent Directives):
 * 1. LAYER 1: Authentication (OIDC/Passport) - Manages identity verification via IBM App ID/Entra.
 * 2. LAYER 2: Session State (express-session) - Secures the Thread ID to prevent frontend amnesia.
 * 3. LAYER 3: Proxy (SSE) - Pipes raw Server-Sent Events from Watsonx directly to React.
 */

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Issuer, Strategy } from 'openid-client';
import { protect } from './middleware/auth.js';
import { streamChat } from './clients/ibmClient.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const APP_VERSION = "v3.0-TEMPLATE-API"; 

app.use(express.json());

// CORS configuration allows the frontend to inspect custom tracking headers
app.use(cors({
    origin: true,
    credentials: true,
    exposedHeaders: ['X-IBM-THREAD-ID']
}));

// Trust Proxy is required for express-session to accept 'secure: true' cookies when 
// deployed behind IBM Code Engine's load balancers.
app.set('trust proxy', 1); 

// --- LAYER 2: SESSION MANAGEMENT ---
// AI AGENT NOTE: This session holds the Watsonx Thread ID. Do not rely on React to 
// hold the Thread ID across page reloads.
app.use(session({
    secret: process.env.SESSION_SECRET || 'watsonx-demo-secret-string',
    resave: true,
    saveUninitialized: true,
    name: 'watsonx_session',
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// --- LAYER 1: AUTHENTICATION (OIDC) ---
// Agnostic OIDC implementation. To switch to Microsoft Entra or Auth0, simply 
// change the OIDC_* environment variables. No code changes required here.
const ibmIssuer = await Issuer.discover(process.env.OIDC_DISCOVERY_URL);
const client = new ibmIssuer.Client({
    client_id: process.env.OIDC_CLIENT_ID,
    client_secret: process.env.OIDC_CLIENT_SECRET,
    redirect_uris: [process.env.OIDC_REDIRECT_URI],
    response_types: ['code'],
});

passport.use('oidc', new Strategy({ client }, (tokenset, userinfo, done) => {
    return done(null, userinfo);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/api/version', (req, res) => {
    res.json({ version: APP_VERSION });
});

app.get('/auth/login', passport.authenticate('oidc'));
app.get('/auth/callback', (req, res, next) => {
    passport.authenticate('oidc', (err, user, info) => {
        if (err || !user) {
            console.error('Auth Error:', err || 'No user found');
            return res.redirect('/auth/login');
        }
        req.logIn(user, (loginErr) => {
            if (loginErr) return res.status(500).send('Session Login Error');
            return res.redirect('/');
        });
    })(req, res, next);
});

app.get('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy(() => {
            res.clearCookie('watsonx_session');
            res.redirect('/');
        });
    });
});

// --- LAYER 3: PROXY AND SSE STREAMING ---
app.post('/api/chat', protect, async (req, res) => {
    try {
        let activeThreadId = req.body.threadId;

        // BI-DIRECTIONAL THREAD SYNC
        // 1. If React sends a thread ID, it learned it from the stream payload. Save it.
        // 2. If React sends null, it lost its state. Inject the ID from the secure session.
        if (activeThreadId) {
            req.session.threadId = activeThreadId;
            req.session.save();
        } else if (req.session.threadId) {
            activeThreadId = req.session.threadId;
        }

        const { message } = req.body;
        const response = await streamChat(message, activeThreadId);

        if (!response.ok) {
            const ibmError = await response.text();
            return res.status(response.status).json({ error: 'Watsonx API Error', raw: ibmError });
        }

        // Establish the SSE connection headers for the React frontend
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Pipe the binary stream directly from IBM to the client browser
        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();
    } catch (error) {
        console.error('Chat processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- STATIC ROUTING ---
app.get('/', (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/login');
    next();
});

app.use(express.static(path.join(__dirname, '../public')));

// Fallback to prevent HTML serving for missing Vite assets (e.g., fonts, images)
app.use('/assets', (req, res) => {
    res.status(404).send('Asset Not Found');
});

// Catch-all route to support React Router inside the SPA
app.get('*', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/login');
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 [${APP_VERSION}] Fully Modular Server active on port ${PORT}`);
});
