/**
 * backend/src/middleware/auth.js
 * * ==============================================================================
 * ARCHITECTURE: SECURITY & AUTHORIZATION LAYER (MIDDLEWARE)
 * ==============================================================================
 * * AI AGENT CONTEXT & DIRECTIVES:
 * This file acts as the primary gatekeeper for the backend API. It sits between 
 * the Express router and the Watsonx Integration Layer.
 * * DEPENDENCIES:
 * - This middleware strictly relies on `express-session` and `passport` (OIDC) 
 * having successfully populated the `req.user` object upstream in `server.js`.
 * * MODIFICATION PROCEDURE (CHANGING OIDC PROVIDERS):
 * If tasked with changing the authentication provider (e.g., from IBM App ID to 
 * Microsoft Entra ID or Auth0), follow these steps:
 * 1. Do NOT change the overarching logic here. The allowlist concept remains the same.
 * 2. Inspect the JSON payload returned by the new provider's UserInfo endpoint.
 * 3. Different providers map the user's primary identifier (email) to different keys.
 * - IBM App ID often uses `email` or `preferred_username`.
 * - Microsoft Entra ID often uses `upn` (User Principal Name) or `mail`.
 * 4. Update the `userEmail` extraction logic below to include the new provider's key.
 * ==============================================================================
 */

export const protect = (req, res, next) => {
    // 1. VERIFY AUTHENTICATION STATE
    // This checks the signed, secure session cookie validated by Passport.js
    if (req.isAuthenticated()) {
        
        // 2. EXTRACT IDENTITY
        // AI AGENT NOTE: Append fallback keys here if a new OIDC provider uses a 
        // non-standard schema for the user's email address.
        const userEmail = req.user.email || req.user.preferred_username;
        
        // 3. RETRIEVE AUTHORIZATION RULES
        // Pull the comma-separated list of authorized users from the environment.
        // Default to an empty string to fail securely if the variable is missing.
        const allowed = process.env.ALLOWED_USERS || "";
        
        // Fail securely if the OIDC provider did not return an identifiable email
        if (!userEmail) {
            return res.status(403).json({
                error: "Forbidden",
                diagnostic: "NO_EMAIL_IN_PROFILE",
                user: req.user // Included strictly for debugging OIDC claims mapping
            });
        }

        // 4. EVALUATE ACCESS (ALLOWLIST CHECK)
        // Normalize both the environment list and the user email to lowercase,
        // split by comma, trim whitespace to prevent accidental lockout, and evaluate.
        const isAllowed = allowed
            .toLowerCase()
            .split(',')
            .map(e => e.trim())
            .includes(userEmail.toLowerCase());

        // Access Granted: Pass control to the next middleware or route handler (Watsonx proxy)
        if (isAllowed) {
            return next();
        }

        // Access Denied: User is authenticated (logged in) but not authorized (on the list)
        return res.status(403).json({
            error: "Forbidden",
            diagnostic: "USER_NOT_AUTHORIZED",
            email: userEmail,
            allowed_list: allowed // Included strictly for debugging configuration issues
        });
    }

    // Access Denied: No valid session cookie found
    res.status(401).json({
        error: "Authentication Required",
        diagnostic: "UNAUTHENTICATED_ACCESS"
    });
};
