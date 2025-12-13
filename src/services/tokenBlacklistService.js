const Redis = require("ioredis");

// Create Redis client with fallback to in-memory storage if Redis is unavailable
let redisClient = null;
let inMemoryBlacklist = new Map(); // Fallback for development without Redis
let useRedis = false;

// Try to initialize Redis only if configured
if (process.env.REDIS_HOST || process.env.REDIS_ENABLED === "true") {
    try {
        redisClient = new Redis(process.env.REDIS_URL,
            { retryStrategy: (times) => {
                if (times > 3) {
                    console.warn("Redis connection failed. Using in-memory blacklist fallback.");
                    return null; // Stop retrying
                }
                return Math.min(times * 100, 3000);
            },
        });

        redisClient.on("connect", () => {
            useRedis = true;
            console.log("✓ Redis connected for token blacklist");
        });

        redisClient.on("error", (err) => {
            console.warn("Redis error, falling back to in-memory storage:", err.message);
            useRedis = false;
        });
    } catch (error) {
        console.warn("Redis initialization failed. Using in-memory blacklist:", error.message);
        useRedis = false;
    }
} else {
    console.log("ℹ Using in-memory token blacklist (Redis not configured)");
}

/**
 * Add a token to the blacklist with expiration
 * @param {string} token - The JWT token to blacklist
 * @param {number} expiresInSeconds - Time until token expires naturally
 */
async function blacklistToken(token, expiresInSeconds) {
    try {
        if (useRedis && redisClient) {
            // Store in Redis with expiration
            await redisClient.setex(`blacklist:${token}`, expiresInSeconds, "1");
        } else {
            // Store in memory with expiration
            const expiryTime = Date.now() + expiresInSeconds * 1000;
            inMemoryBlacklist.set(token, expiryTime);
            
            // Clean up expired tokens periodically
            setTimeout(() => {
                inMemoryBlacklist.delete(token);
            }, expiresInSeconds * 1000);
        }
        return true;
    } catch (error) {
        console.error("Error blacklisting token:", error);
        return false;
    }
}

/**
 * Check if a token is blacklisted
 * @param {string} token - The JWT token to check
 * @returns {Promise<boolean>} - True if blacklisted, false otherwise
 */
async function isTokenBlacklisted(token) {
    try {
        if (useRedis && redisClient) {
            const result = await redisClient.get(`blacklist:${token}`);
            return result !== null;
        } else {
            // Check in-memory storage
            const expiryTime = inMemoryBlacklist.get(token);
            if (!expiryTime) return false;
            
            // Check if expired
            if (Date.now() > expiryTime) {
                inMemoryBlacklist.delete(token);
                return false;
            }
            return true;
        }
    } catch (error) {
        console.error("Error checking token blacklist:", error);
        return false; // Fail open for availability
    }
}

/**
 * Clean up expired tokens from in-memory storage (periodic maintenance)
 */
function cleanupExpiredTokens() {
    if (!useRedis) {
        const now = Date.now();
        for (const [token, expiryTime] of inMemoryBlacklist.entries()) {
            if (now > expiryTime) {
                inMemoryBlacklist.delete(token);
            }
        }
    }
}

// Run cleanup every 5 minutes for in-memory storage
setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

/**
 * Graceful shutdown
 */
async function disconnect() {
    if (redisClient) {
        await redisClient.quit();
    }
    inMemoryBlacklist.clear();
}

module.exports = {
    blacklistToken,
    isTokenBlacklisted,
    disconnect,
};
