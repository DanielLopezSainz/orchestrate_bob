// backend/src/clients/ibmClient.js
import { getIAMToken } from '../services/iam.js';

export const streamChat = async (message, threadId) => {
    // We pass the API_KEY from the environment variable
    const token = await getIAMToken(process.env.API_KEY);
    const orchestrateUrl = `${process.env.ORCHESTRATE_INSTANCE_URL}/v1/orchestrate/${process.env.AGENT_ID}/chat/completions`;

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    if (threadId) headers['X-IBM-THREAD-ID'] = threadId;

    return fetch(orchestrateUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            messages: [{ role: 'user', content: message }],
            stream: true
        })
    });
};