const pool = require("../db");

/**
 * Warm up database connection (for Neon auto-suspend)
 */
async function warmUpDatabase() {
    try {
        await pool.query("SELECT 1");
        console.log("✓ Database connection warmed up");
        return true;
    } catch (error) {
        console.error("⚠️ Database warm-up failed:", error.message);
        return false;
    }
}

/**
 * Clean up expired refresh tokens from the database
 * This should be run periodically (e.g., daily via cron job or on server start)
 */
async function cleanupExpiredRefreshTokens() {
    try {
        const jwt = require("jsonwebtoken");
        
        // Warm up DB connection first (important for Neon)
        await warmUpDatabase();
        
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
             WHERE created_at < NOW() - ($1 || ' days')::interval`,
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
    console.log("⏰ Token cleanup job scheduled (runs every 24 hours)");
    
    // Run first cleanup after 2 minutes (give DB time to warm up)
    setTimeout(async () => {
        try {
            const deletedCount = await cleanupExpiredRefreshTokens();
            console.log(`✓ Cleanup job completed: ${deletedCount} tokens deleted`);
        } catch (error) {
            console.error("⚠️ Cleanup job failed (will retry in 24h):", error.message);
        }
    }, 2 * 60 * 1000); // 2 minutes
    
    // Then run every 24 hours
    setInterval(async () => {
        try {
            const deletedCount = await cleanupExpiredRefreshTokens();
            console.log(`✓ Cleanup job completed: ${deletedCount} tokens deleted`);
        } catch (error) {
            console.error("⚠️ Cleanup job failed (will retry in 24h):", error.message);
        }
    }, 24 * 60 * 60 * 1000); // 24 hours
}

module.exports = {
    cleanupExpiredRefreshTokens,
    cleanupOldRefreshTokens,  // Alternative cleanup method - can be used instead of cleanupExpiredRefreshTokens
    startCleanupJob
};
