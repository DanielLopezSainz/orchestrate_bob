// backend/src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getIAMToken } from './services/iam.js';

// Load variables from .env file
dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const { API_KEY, ORCHESTRATE_INSTANCE_URL, AGENT_ID } = process.env;

// 1. Health Check Endpoint (Required by IBM Code Engine)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Up and running' });
});

// 2. Chat Endpoint (Phase 1: Basic synchronous test)
app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message || "Hello, agent!";

        // Step 1: Securely get/cache the IAM token
        const token = await getIAMToken(API_KEY);

        // Step 2: Construct the full Orchestrate URL
        //const orchestrateUrl=  `${ORCHESTRATE_INSTANCE_URL}/api/v1/orchestrate/${AGENT_ID}/chat/completions`;
        const orchestrateUrl = `${ORCHESTRATE_INSTANCE_URL}/v1/orchestrate/${AGENT_ID}/chat/completions`;

        // Step 3: Forward the request to Watsonx
        const response = await fetch(orchestrateUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: userMessage }],
                stream: false // Disabled for Phase 1 testing
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Orchestrate API Error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error("Chat Endpoint Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Watsonx Frontend Server running on port ${PORT}`);
});