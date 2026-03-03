// backend/src/server.js - DIAGNOSTIC VERSION
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getIAMToken } from './services/iam.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '../.env' }); 

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.post('/api/chat', async (req, res) => {
    // Capture variables for the diagnostic report
    const envSnapshot = {
        API_KEY: process.env.API_KEY ? `${process.env.API_KEY.substring(0, 5)}...` : "MISSING",
        FULL_API_KEY_LENGTH: process.env.API_KEY?.length || 0,
        INSTANCE_URL: process.env.ORCHESTRATE_INSTANCE_URL || "MISSING",
        AGENT_ID: process.env.AGENT_ID || "MISSING",
    };

    try {
        const { message, threadId } = req.body;
        const token = await getIAMToken(process.env.API_KEY);
        const orchestrateUrl = `${process.env.ORCHESTRATE_INSTANCE_URL}/v1/orchestrate/${process.env.AGENT_ID}/chat/completions`;

        const orchestrateHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (threadId) orchestrateHeaders['X-IBM-THREAD-ID'] = threadId;

        const response = await fetch(orchestrateUrl, {
            method: 'POST',
            headers: orchestrateHeaders,
            body: JSON.stringify({
                messages: [{ role: 'user', content: message }], 
                stream: true
            })
        });

        if (!response.ok) {
            // CATCH THE DETAILED ERROR FROM IBM
            const errorBody = await response.text();
            return res.status(response.status).json({
                diagnostic: "IBM_API_REJECTION",
                status: response.status,
                ibmError: errorBody,
                env: envSnapshot
            });
        }

        // ... standard streaming logic ...
        res.setHeader('Content-Type', 'text/event-stream');
        const responseThreadId = response.headers.get('X-IBM-THREAD-ID');
        if (responseThreadId) res.setHeader('X-IBM-THREAD-ID', responseThreadId);
        res.flushHeaders(); 

        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

    } catch (error) {
        // CATCH SYSTEM ERRORS (Auth failures, Network timeouts)
        res.status(500).json({
            diagnostic: "SERVER_SYSTEM_ERROR",
            message: error.message,
            env: envSnapshot
        });
    }
});

app.use(express.static(path.join(__dirname, '../public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.listen(PORT, () => console.log(`🚀 Diagnostic Server on ${PORT}`));
