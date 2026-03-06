import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Issuer, Strategy } from 'openid-client';
import { protect } from './middleware/auth.js';
import { streamChat } from './clients/ibmClient.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// --- VERSIONING & DEBUGGING ---
// Update this string to match your build tracking
const APP_VERSION = "v2.1-BUILD-33-FINAL-SYNC"; 

app.use(express.json());

// 🟢 CRITICAL FOR CODE ENGINE: Trust the proxy to allow secure cookies over HTTPS
app.set('trust proxy', 1); 

// 1. Session & Passport Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'watsonx-demo-secret-string',
    resave: true,
    saveUninitialized: true,
    name: 'watsonx_session',
    cookie: {
        secure: true,    // Required for IBM Code Engine HTTPS
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// 2. OIDC Strategy Setup (IBM ID / App ID)
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

// 3. Version API Endpoint
app.get('/api/version', (req, res) => {
    res.json({ version: APP_VERSION });
});

// 4. Authentication Routes
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

// 5. Protected Chat API Route (Fixes Thread ID Persistence)
app.post('/api/chat', protect, async (req, res) => {
    try {
        const { message, threadId } = req.body;
        
        // Log incoming state for Code Engine log monitoring
        console.log(`[${APP_VERSION}] Req: "${message.substring(0, 20)}..." | ThreadID: ${threadId || 'NEW'}`);

        const response = await streamChat(message, threadId);

        if (!response.ok) {
            const ibmError = await response.text();
            return res.status(response.status).json({ error: 'Watsonx API Error', raw: ibmError });
        }

        // 🟢 THE CRITICAL FIX: Extract the Thread ID and EXPOSE it to the frontend browser
        const xThreadId = response.headers.get('X-IBM-THREAD-ID');
        if (xThreadId) {
            console.log(`[${APP_VERSION}] Thread Sync: ${xThreadId}`);
            res.setHeader('Access-Control-Expose-Headers', 'X-IBM-THREAD-ID');
            res.setHeader('X-IBM-THREAD-ID', xThreadId);
        }

        // Stream the response back to the client
        res.setHeader('Content-Type', 'text/event-stream');
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

// 6. Static File Serving & Security Gate
app.get('/', (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/login');
    next();
});

// Pointing to the 'public' folder where Vite builds the frontend
app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/login');
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 [${APP_VERSION}] Modular Server active on port ${PORT}`);
});
