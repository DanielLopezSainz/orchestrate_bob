/**
 * backend/src/services/iam.js
 * * ==============================================================================
 * ARCHITECTURE: EXTERNAL API INTEGRATION LAYER (IAM AUTHENTICATION)
 * ==============================================================================
 * * AI AGENT CONTEXT & DIRECTIVES:
 * This file is responsible for authenticating the application itself (via Service ID / 
 * API Key) against IBM Cloud IAM to obtain Bearer tokens for Watsonx API calls.
 * * * CRITICAL DIRECTIVES FOR AGENTS:
 * 1. CACHING IS MANDATORY: You must not remove or bypass the `cachedToken` logic. 
 * Fetching a new IAM token on every single chat message will result in the 
 * application being severely rate-limited by IBM Cloud.
 * 2. BUFFER MATH: The `tokenExpiration` math includes a 60-second safety buffer 
 * `(data.expires_in - 60)`. Do not remove this buffer. It prevents edge-case 
 * failures where a token evaluates as valid locally, but expires while in 
 * transit over the network to the Watsonx server.
 * ==============================================================================
 */

// In-memory cache variables. 
// Note: In a highly distributed deployment (e.g., many independent stateless 
// pods without sticky sessions), these could be migrated to a Redis store. 
// For standard IBM Code Engine deployments, container-level memory is sufficient.
let cachedToken = null;
let tokenExpiration = 0;

export async function getIAMToken(apiKey) {
    // 1. CACHE CHECK
    // Verify if we have a valid token in memory that hasn't crossed the safety buffer
    if (cachedToken && Date.now() < tokenExpiration) {
        return cachedToken;
    }

    // 2. PREPARE PAYLOAD
    // The IBM IAM endpoint strictly requires URL-encoded form data, not JSON.
    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ibm:params:oauth:grant-type:apikey');
    params.append('apikey', apiKey);

    // 3. FETCH NEW TOKEN
    const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: params
    });

    // 4. ERROR HANDLING
    // Fail loudly if the API key is invalid, revoked, or IAM is down
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IAM Auth Failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // 5. CACHE UPDATE & BUFFER CALCULATION
    cachedToken = data.access_token;
    
    // Convert expires_in (seconds) to milliseconds, subtract the 60s buffer,
    // and add it to the current epoch timestamp.
    tokenExpiration = Date.now() + ((data.expires_in - 60) * 1000);

    return cachedToken;
}
