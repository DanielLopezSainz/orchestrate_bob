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

// --- VERSIONING TOKEN ---
const APP_VERSION = "v2.4-UI-ROUTING-FIX"; 

app.use(express.json());

app.use(cors({
    origin: true,
    credentials: true
}));

app.set('trust proxy', 1); 

// 1. Session Configuration
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

// 2. OIDC Strategy Setup
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

// 5. Protected Chat API Route 
app.post('/api/chat', protect, async (req, res) => {
    try {
        let activeThreadId = req.body.threadId;

        // BI-DIRECTIONAL SYNC
        if (activeThreadId) {
            req.session.threadId = activeThreadId;
            req.session.save();
        } else if (req.session.threadId) {
            activeThreadId = req.session.threadId;
        }

        const { message } = req.body;
        
        console.log(`[${APP_VERSION}] Req: "${message.substring(0, 20)}..." | ThreadID: ${activeThreadId || 'NEW'}`);

        const response = await streamChat(message, activeThreadId);

        if (!response.ok) {
            const ibmError = await response.text();
            return res.status(response.status).json({ error: 'Watsonx API Error', raw: ibmError });
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
        console.error('Chat processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 6. Static File Serving & Security Gate
app.get('/', (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/login');
    next();
});

app.use(express.static(path.join(__dirname, '../public')));

// 🛡️ UI BUG FIX: Prevent Express from serving index.html for missing static assets
app.use('/assets', (req, res) => {
    res.status(404).send('Asset Not Found');
});

app.get('*', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/auth/login');
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 [${APP_VERSION}] Fully Modular Server active on port ${PORT}`);
});
