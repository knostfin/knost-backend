const { checkForSensitiveData } = require('../utils/security');

/**
 * Middleware to check API responses for accidental exposure of sensitive data
 * Only active in development environment
 * Skips legitimate endpoints that are supposed to return tokens
 */
function securityResponseChecker(req, res, next) {
    if (process.env.NODE_ENV === "production") {
        return next();
    }

    // Endpoints that legitimately return tokens (skip security check)
    const tokenEndpoints = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/verify-otp',
        '/api/auth/refresh'
    ];

    // Skip security check for token endpoints
    if (tokenEndpoints.some(endpoint => req.path === endpoint)) {
        return next();
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to check response
    res.json = function(data) {
        // Check for sensitive data in the response
        const sensitiveFields = checkForSensitiveData(data);

        if (sensitiveFields.length > 0) {
            console.warn(`🚨 SECURITY WARNING: Response contains sensitive data:`, sensitiveFields);
            console.warn(`Request: ${req.method} ${req.path}`);
            console.warn(`Response data:`, JSON.stringify(data, null, 2));
        }

        // Call original json method
        return originalJson.call(this, data);
    };

    next();
}

module.exports = securityResponseChecker;