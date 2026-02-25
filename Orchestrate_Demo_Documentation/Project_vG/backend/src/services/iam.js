// backend/src/services/iam.js
let cachedToken = null;
let tokenExpiration = 0;

export async function getIAMToken(apiKey) {
    // If we have a cached token that is valid for at least another 60 seconds, use it
    if (cachedToken && Date.now() < tokenExpiration) {
        return cachedToken;
    }

    console.log("Fetching new IAM Bearer Token...");

    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ibm:params:oauth:grant-type:apikey');
    params.append('apikey', apiKey);

    const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: params
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IAM Auth Failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;

    // data.expires_in is in seconds. We subtract a 60-second buffer to be safe.
    tokenExpiration = Date.now() + ((data.expires_in - 60) * 1000);

    return cachedToken;
}