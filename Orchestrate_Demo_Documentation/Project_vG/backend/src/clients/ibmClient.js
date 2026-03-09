/**
 * backend/src/clients/ibmClient.js
 * * ==============================================================================
 * ARCHITECTURE: EXTERNAL API INTEGRATION LAYER (WATSONX CLIENT)
 * ==============================================================================
 * * AI AGENT CONTEXT & DIRECTIVES:
 * This file serves as the strict boundary between the local Node.js server and 
 * the external IBM Watsonx Orchestrate API.
 * * * CRITICAL DIRECTIVES FOR AGENTS:
 * 1. DO NOT CONSUME THE RESPONSE HERE: This function must return the raw `fetch` 
 * Promise. The upstream caller (`server.js`) needs the raw Response object so 
 * it can pipe the Server-Sent Events (SSE) stream directly to the frontend.
 * If you call `await response.json()` or `await response.text()` here, you 
 * will permanently break the streaming architecture.
 * 2. THREAD INJECTION: The `X-IBM-THREAD-ID` header is optional but critical for 
 * session memory. If provided by the upstream session layer, it must be attached.
 * 3. STREAMING FLAG: The payload must ALWAYS include `stream: true`.
 * ==============================================================================
 */

import { getIAMToken } from '../services/iam.js';

export const streamChat = async (message, threadId) => {
    // 1. Dynamically retrieve/cache the IAM token using the environment API key
    const token = await getIAMToken(process.env.API_KEY);
    
    // 2. Construct the REST endpoint for the specific Agent ID
    const orchestrateUrl = `${process.env.ORCHESTRATE_INSTANCE_URL}/v1/orchestrate/${process.env.AGENT_ID}/chat/completions`;

    // 3. Setup required base headers for IBM Cloud API calls
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    
    // 4. Conditionally attach the Thread ID to resume a previous conversation context
    if (threadId) {
        headers['X-IBM-THREAD-ID'] = threadId;
    }

    // 5. Execute and Return the raw Promise. 
    // AI AGENT NOTE: DO NOT resolve the body stream here.
    return fetch(orchestrateUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            messages: [{ role: 'user', content: message }],
            stream: true // Enforces the SSE response format required by the frontend
        })
    });
};
