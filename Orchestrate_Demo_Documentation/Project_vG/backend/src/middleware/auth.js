// backend/src/middleware/auth.js

export const protect = (req, res, next) => {
    // Capture environment snapshot for diagnostics
    const envSnapshot = {
        API_KEY: process.env.API_KEY ? `${process.env.API_KEY.substring(0, 5)}...` : "MISSING",
        INSTANCE_URL: process.env.ORCHESTRATE_INSTANCE_URL || "MISSING",
        AGENT_ID: process.env.AGENT_ID || "MISSING",
        ALLOWED_USERS: process.env.ALLOWED_USERS || "NOT_SET"
    };

    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: 'Authentication Required',
            diagnostic: 'UNAUTHENTICATED_ACCESS',
            env: envSnapshot,
            sessionId: req.sessionID // Provides the Express session ID
        });
    }

    const allowedString = process.env.ALLOWED_USERS || "";
    const allowedUsers = allowedString.split(',').map(email => email.trim().toLowerCase());
    const userEmail = (req.user.email || req.user.preferred_username || "").toLowerCase();

    if (!allowedUsers.includes(userEmail)) {
        return res.status(403).json({
            error: 'Access Denied',
            diagnostic: 'USER_NOT_IN_ALLOW_LIST',
            userAttempted: userEmail,
            env: envSnapshot,
            sessionId: req.sessionID
        });
    }

    next();
};