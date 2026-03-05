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

// --- DEBUG VERSION MARKER ---
const APP_VERSION = "v2.1-BUILD-MAR05-FINAL"; 

app.use(express.json());
app.set('trust proxy', 1); 

app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-12345',
    resave: true,
    saveUninitialized: true,
    name: 'watsonx_session',
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

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

// 1. Version API
app.get('/api/version', (req, res) => {
    res.json({ version: APP_VERSION });
});

// 2. Auth Routes
app.get('/auth/login', passport.authenticate('oidc'));
app.get('/auth/callback', (req, res, next) => {
    passport.authenticate('oidc', (err, user, info) => {
        if (err || !user) return res.redirect('/auth/login');
        req.logIn(user, (loginErr) => {
            if (loginErr) return res.status(500).send('Login Error');
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

// 3. Protected API Route (With Enhanced Debugging)
app.post('/api/chat', protect, async (req, res) => {
    try {
        const { message, threadId } = req.body;
        
        // DEBUG LOG: Critical to see if the frontend is persisting the ID
        console.log(`[${APP_VERSION}] Incoming Request - ThreadID: ${threadId || 'NEW_CONVERSATION'}`);

        const response = await streamChat(message, threadId);

        if (!response.ok) {
            const ibmError = await response.text();
            return res.status(response.status).json({ error: 'Watsonx API Error', ibmRaw: ibmError });
        }

        const xThreadId = response.headers.get('X-IBM-THREAD-ID');
        if (xThreadId) {
            res.setHeader('X-IBM-THREAD-ID', xThreadId);
            // DEBUG LOG: Confirming Watsonx accepted/assigned the thread
            console.log(`[${APP_VERSION}] Outgoing Header - ThreadID: ${xThreadId}`);
        }

        res.setHeader('Content-Type', 'text/event-stream');
        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();
    } catch (error) {
        console.error('Chat Route Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Static Files & Security
app.get('/', (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/login');
    next();
});

app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/login');
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 [${APP_VERSION}] Server listening on port ${PORT}`));
