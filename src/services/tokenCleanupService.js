const pool = require("../db");

/**
 * Clean up expired refresh tokens from the database
 * This should be run periodically (e.g., daily via cron job or on server start)
 */
async function cleanupExpiredRefreshTokens() {
    try {
        const jwt = require("jsonwebtoken");
        
        // Get all refresh tokens
        const result = await pool.query("SELECT id, token FROM refresh_tokens");
        
        let deletedCount = 0;
        
        for (const row of result.rows) {
            try {
                // Try to verify the token
                jwt.verify(row.token, process.env.REFRESH_TOKEN_SECRET);
                // Token is still valid, keep it
            } catch (err) {
                // Token is expired or invalid, delete it
                await pool.query("DELETE FROM refresh_tokens WHERE id = $1", [row.id]);
                deletedCount++;
            }
        }
        
        return deletedCount;
    } catch (error) {
        console.error("Error cleaning up expired refresh tokens:", error);
        throw error;
    }
}

/**
 * Alternative: Delete tokens older than refresh token expiry period
 * More efficient than checking each token individually
 */
async function cleanupOldRefreshTokens(daysOld = 7) {
    try {
        const result = await pool.query(
            `DELETE FROM refresh_tokens 
             WHERE created_at < NOW() - INTERVAL '$1 days'`,
            [daysOld]
        );
        
        console.log(`✓ Deleted ${result.rowCount} refresh tokens older than ${daysOld} days`);
        return result.rowCount;
    } catch (error) {
        console.error("Error cleaning up old refresh tokens:", error);
        throw error;
    }
}

/**
 * Start periodic cleanup job
 * Runs cleanup every 24 hours
 */
function startCleanupJob() {
    // Run immediately on start
    cleanupExpiredRefreshTokens().catch(console.error);
    
    // Then run every 24 hours
    setInterval(() => {
        cleanupExpiredRefreshTokens().catch(console.error);
    }, 24 * 60 * 60 * 1000); // 24 hours
}

module.exports = {
    cleanupExpiredRefreshTokens,
    cleanupOldRefreshTokens,
    startCleanupJob,
};
