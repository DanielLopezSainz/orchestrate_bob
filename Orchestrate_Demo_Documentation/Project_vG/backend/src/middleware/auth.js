export const protect = (req, res, next) => {
    if (req.isAuthenticated()) {
        // App ID might provide email in 'email' or 'preferred_username'
        const userEmail = req.user.email || req.user.preferred_username;
        const allowed = process.env.ALLOWED_USERS || "";
        
        if (!userEmail) {
            return res.status(403).json({
                error: "Forbidden",
                diagnostic: "NO_EMAIL_IN_PROFILE",
                user: req.user
            });
        }

        // Case-insensitive check against the comma-separated list
        const isAllowed = allowed
            .toLowerCase()
            .split(',')
            .map(e => e.trim())
            .includes(userEmail.toLowerCase());

        if (isAllowed) {
            return next();
        }

        return res.status(403).json({
            error: "Forbidden",
            diagnostic: "USER_NOT_AUTHORIZED",
            email: userEmail,
            allowed_list: allowed
        });
    }

    res.status(401).json({
        error: "Authentication Required",
        diagnostic: "UNAUTHENTICATED_ACCESS"
    });
};
