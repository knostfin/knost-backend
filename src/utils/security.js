/**
 * Security utilities to prevent accidental exposure of sensitive data
 */

/**
 * Sanitizes user objects by removing sensitive fields
 * @param {Object} user - User object from database
 * @returns {Object} - Sanitized user object safe for API responses
 */
function sanitizeUser(user) {
    if (!user || typeof user !== 'object') return user;

    const sanitized = { ...user };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'otp', 'verification_code', 'token', 'reset_token'];
    sensitiveFields.forEach(field => {
        delete sanitized[field];
    });

    return sanitized;
}

/**
 * Logs sensitive data only in development environment
 * @param {string} label - Label for the log
 * @param {*} data - Sensitive data to log
 */
function devLog(label, data) {
    if (process.env.NODE_ENV !== "production") {
        console.log(`🔒 ${label}:`, data);
    }
}

/**
 * Checks if a response object contains sensitive data
 * @param {Object} obj - Object to check
 * @returns {string[]} - Array of sensitive field names found
 */
function checkForSensitiveData(obj) {
    if (!obj || typeof obj !== 'object') return [];

    const sensitiveFields = ['password', 'otp', 'verification_code', 'token', 'reset_token', 'secret'];
    const found = [];

    function checkObject(o, path = '') {
        for (const [key, value] of Object.entries(o)) {
            const currentPath = path ? `${path}.${key}` : key;

            if (sensitiveFields.includes(key.toLowerCase())) {
                found.push(currentPath);
            }

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                checkObject(value, currentPath);
            }
        }
    }

    checkObject(obj);
    return found;
}

module.exports = {
    sanitizeUser,
    devLog,
    checkForSensitiveData
};