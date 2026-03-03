// backend/src/services/iam.js
let cachedToken = null;
let tokenExpiration = 0;

export async function getIAMToken(apiKey) {
    if (cachedToken && Date.now() < tokenExpiration) {
        return cachedToken;
    }

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
    tokenExpiration = Date.now() + ((data.expires_in - 60) * 1000);

    return cachedToken;
}