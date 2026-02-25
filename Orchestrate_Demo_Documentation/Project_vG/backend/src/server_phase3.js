// backend/src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getIAMToken } from './services/iam.js';

dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const { API_KEY, ORCHESTRATE_INSTANCE_URL, AGENT_ID } = process.env;

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Up and running' });
});

app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message || "Hello, agent!";
        const token = await getIAMToken(API_KEY);
        const orchestrateUrl = `${ORCHESTRATE_INSTANCE_URL}/v1/orchestrate/${AGENT_ID}/chat/completions`;

        const response = await fetch(orchestrateUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: userMessage }],
                stream: true // 1. ENABLED STREAMING
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Orchestrate API Error (${response.status}): ${errorData}`);
        }

        // 2. Set up Server-Sent Events (SSE) Headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders(); // Tell the client the stream is starting

        // 3. Read the stream from IBM and pipe it directly to the React client
        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

    } catch (error) {
        console.error("Chat Endpoint Error:", error.message);
        // If we haven't started streaming yet, send a standard JSON error
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            // If we are already streaming, send an error event
            res.write(`data: {"error": "${error.message}"}\n\n`);
            res.end();
        }
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Watsonx Streaming Server running on port ${PORT}`);
});