import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Issuer, Strategy } from 'openid-client';
import { protect } from './middleware/auth.js';
import { streamChat } from './clients/ibmClient.js';
import { getIAMToken } from './services/iam.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json());

// 1. Session & Passport Initialization
// Note: We use the SESSION_SECRET from your Code Engine env variables
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-use-env-in-prod',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// 2. OIDC Strategy Setup (Identity Agnostic)
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

// 3. Auth Routes
app.get('/auth/login', passport.authenticate('oidc'));

app.get('/auth/callback', passport.authenticate('oidc', {
    successRedirect: '/',
    failureRedirect: '/auth/login',
}));

app.get('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy(() => {
            res.redirect('/');
        });
    });
});

// 4. Protected API Route with Enhanced Diagnostics
app.post('/api/chat', protect, async (req, res) => {
    try {
        const { message, threadId } = req.body;
        const response = await streamChat(message, threadId);

        // If Watsonx returns an error (4xx or 5xx)
        if (!response.ok) {
            const ibmError = await response.text();
            return res.status(response.status).json({
                error: 'Watsonx API Error',
                status: response.status,
                ibmRaw: ibmError,
                threadId: threadId || 'NEW_THREAD',
                sessionId: req.sessionID // Restore diagnostic sessionId
            });
        }

        // Pass-through the streaming headers from Watsonx
        res.setHeader('Content-Type', 'text/event-stream');
        const xThreadId = response.headers.get('X-IBM-THREAD-ID');
        if (xThreadId) res.setHeader('X-IBM-THREAD-ID', xThreadId);

        // Pipe the stream directly to the browser
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

    } catch (error) {
        // System-level errors (network down, IAM failed)
        res.status(500).json({
            error: error.message,
            diagnostic: 'SERVER_INTERNAL_CRASH',
            sessionId: req.sessionID,
            threadId: req.body.threadId || 'N/A'
        });
    }
});

// 5. Serve Frontend
app.use(express.static(path.join(__dirname, '../public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Modular Server listening on port ${PORT}`));