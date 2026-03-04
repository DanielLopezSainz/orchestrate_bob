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

app.use(express.json());

// 1. Session & Passport Initialization
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-12345',
    resave: false,
    saveUninitialized: false, // Changed to false for better session health
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
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

// Critical: These must work for the session to be created
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// 3. Auth Routes
app.get('/auth/login', passport.authenticate('oidc'));

// Updated Callback with internal logging
app.get('/auth/callback', (req, res, next) => {
    passport.authenticate('oidc', (err, user, info) => {
        if (err) {
            console.error('OIDC Auth Error:', err);
            return res.status(500).send(`Authentication Failed: ${err.message}`);
        }
        if (!user) {
            console.error('No user found in callback:', info);
            return res.redirect('/auth/login');
        }
        req.logIn(user, (loginErr) => {
            if (loginErr) {
                console.error('Login Session Error:', loginErr);
                return res.status(500).send('Session Login Error');
            }
            return res.redirect('/');
        });
    })(req, res, next);
});

app.get('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    });
});

// 4. Protected API Route
app.post('/api/chat', protect, async (req, res) => {
    try {
        const { message, threadId } = req.body;
        const response = await streamChat(message, threadId);

        if (!response.ok) {
            const ibmError = await response.text();
            return res.status(response.status).json({
                error: 'Watsonx API Error',
                ibmRaw: ibmError
            });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        const xThreadId = response.headers.get('X-IBM-THREAD-ID');
        if (xThreadId) res.setHeader('X-IBM-THREAD-ID', xThreadId);

        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Global Security Gate & Static Files
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
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
