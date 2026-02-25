// backend/src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getIAMToken } from './services/iam.js';

// Setup for ES Module directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const { API_KEY, ORCHESTRATE_INSTANCE_URL, AGENT_ID } = process.env;

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Up and running' });
});

// --- API ROUTES ---
app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        const threadId = req.body.threadId;

        if (!userMessage) {
            throw new Error("Invalid request: 'message' string is required.");
        }

        const token = await getIAMToken(API_KEY);
        const orchestrateUrl = `${ORCHESTRATE_INSTANCE_URL}/v1/orchestrate/${AGENT_ID}/chat/completions`;

        const orchestrateHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (threadId) {
            orchestrateHeaders['X-IBM-THREAD-ID'] = threadId;
        }

        const response = await fetch(orchestrateUrl, {
            method: 'POST',
            headers: orchestrateHeaders,
            body: JSON.stringify({
                messages: [{ role: 'user', content: userMessage }],
                stream: true
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Orchestrate API Error (${response.status}): ${errorData}`);
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const responseThreadId = response.headers.get('X-IBM-THREAD-ID');
        if (responseThreadId) {
            res.setHeader('X-IBM-THREAD-ID', responseThreadId);
            res.setHeader('Access-Control-Expose-Headers', 'X-IBM-THREAD-ID');
        }

        res.flushHeaders();

        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

    } catch (error) {
        console.error("Chat Endpoint Error:", error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            res.write(`data: {"error": "${error.message}"}\n\n`);
            res.end();
        }
    }
});

// --- FRONTEND ROUTES ---
// Serve the static files compiled by Vite (we will place them in a 'public' folder)
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all route: if the user asks for anything else, send them the React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Watsonx Unified Server running on port ${PORT}`);
});