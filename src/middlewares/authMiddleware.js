const jwt = require("jsonwebtoken");
const { isTokenBlacklisted } = require("../services/tokenBlacklistService");

module.exports = async function (req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token)
        return res.status(401).json({ error: "Access denied. No token provided." });

    try {
        // Check if token is blacklisted
        const blacklisted = await isTokenBlacklisted(token);
        if (blacklisted) {
            return res.status(401).json({ error: "Token has been revoked. Please login again." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        req.token = token; // Store token for potential logout
        next();
    } catch {
        res.status(403).json({ error: "Invalid or expired token" });
    }
};