const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

// Generate access token
function generateAccessToken(user) {
    return jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    });
}

// Generate refresh token
function generateRefreshToken(user) {
    return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
    });
}

// Shape DB user row into response with both snake_case and camelCase keys
function mapUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        firstname: row.firstname,
        lastname: row.lastname,
        email: row.email,
        phone: row.phone,
        country_code: row.country_code,
        countryCode: row.country_code,
        created_at: row.created_at,
        createdAt: row.created_at,
        last_login: row.last_login,
        lastLogin: row.last_login,
        photo_filename: row.photo_filename,
        photoFilename: row.photo_filename,
    };
}

// --------------------------- REGISTER -----------------------------------
exports.register = async (req, res) => {
    try {
        const { firstname, lastname, email, password, phone, countryCode } = req.body;

        // Validation
        if (!firstname || !lastname || !email || !password || !phone) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long" });
        }

        const findUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (findUser.rows.length > 0) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const findPhone = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);
        if (findPhone.rows.length > 0) {
            return res.status(400).json({ error: "Phone number already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
            `INSERT INTO users (firstname, lastname, email, password, phone, country_code)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, firstname, lastname, email, phone, country_code, created_at, last_login`,
            [firstname, lastname, email, hashedPassword, phone, countryCode || null]
        );

        res.status(201).json({
            message: "Account created successfully",
            user: mapUser(newUser.rows[0]),
        });

    } catch (err) {
        res.status(500).json({ error: "Something went wrong", details: err.message });
    }
};

// --------------------------- LOGIN -----------------------------------
exports.login = async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        // At least one of email or phone required
        if ((!email && !phone) || !password) {
            return res.status(400).json({
                error: "Email or phone along with password is required"
            });
        }

        let userQuery;

        if (email) {
            userQuery = await pool.query(
                "SELECT * FROM users WHERE email = $1",
                [email]
            );
        } else if (phone) {
            userQuery = await pool.query(
                "SELECT * FROM users WHERE phone = $1",
                [phone]
            );
        }

        const user = userQuery.rows[0];

        if (!user) {
            return res.status(401).json({
                error: "Invalid login credentials"
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid login credentials" });
        }

        // Update last_login
        const updatedMeta = await pool.query(
            "UPDATE users SET last_login = NOW() WHERE id = $1 RETURNING last_login, country_code, created_at",
            [user.id]
        );
        if (updatedMeta.rows[0]) {
            user.last_login = updatedMeta.rows[0].last_login;
            user.country_code = updatedMeta.rows[0].country_code ?? user.country_code;
            user.created_at = updatedMeta.rows[0].created_at ?? user.created_at;
        }

        const accessToken = generateAccessToken({
            id: user.id,
            email: user.email,
            phone: user.phone,
            firstname: user.firstname,
            lastname: user.lastname,
        });

        const refreshToken = generateRefreshToken({ id: user.id });

        // Save refresh token
        await pool.query(
            "INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)",
            [user.id, refreshToken]
        );

        res.json({
            message: "Login successful",
            token: accessToken,
            refreshToken,
            user: mapUser(user),
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// --------------------------- REFRESH TOKEN -------------------------------
exports.refreshToken = async (req, res) => {
    const { token } = req.body;

    if (!token)
        return res.status(401).json({ error: "Refresh token required" });

    const savedToken = await pool.query(
        "SELECT * FROM refresh_tokens WHERE token = $1",
        [token]
    );

    if (savedToken.rows.length === 0)
        return res.status(403).json({ error: "Invalid refresh token" });

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, async (err, user) => {
        if (err) return res.status(403).json({ error: "Token expired or invalid" });

        const newAccessToken = generateAccessToken({ id: user.id });

        res.json({ accessToken: newAccessToken });
    });
};

// --------------------------- VERIFY TOKEN -----------------------------------
exports.verifyToken = async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token)
        return res.status(401).json({ valid: false, error: "Token missing" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err)
            return res.status(403).json({ valid: false, error: "Token expired or invalid" });

        res.json({
            valid: true,
            user,
        });
    });
};

// ------------------------ LOGOUT ----------------------------
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: "Refresh token required" });
        }

        // Delete the refresh token from DB
        await pool.query(
            "DELETE FROM refresh_tokens WHERE token = $1",
            [refreshToken]
        );

        return res.json({ message: "Logged out successfully" });

    } catch (err) {
        console.error("Logout error:", err);
        return res.status(500).json({
            error: "Server error",
            details: err.message
        });
    }
};

// ---------------------- GET PROFILE -------------------------
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // Return complete user object (excluding password)
        const user = result.rows[0];
        delete user.password;

        res.json({ user: mapUser(user) });

    } catch (err) {
        console.error("Get profile error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- UPDATE PROFILE -------------------------
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstname, lastname, phone } = req.body;

        // At least one field required
        if (!firstname && !lastname && !phone) {
            return res.status(400).json({ error: "At least one field is required" });
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (firstname) {
            updates.push(`firstname = $${paramCount++}`);
            values.push(firstname);
        }
        if (lastname) {
            updates.push(`lastname = $${paramCount++}`);
            values.push(lastname);
        }
        if (phone) {
            updates.push(`phone = $${paramCount++}`);
            values.push(phone);
        }

        values.push(userId);
        const query = `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // Return complete user object (excluding password)
        const user = result.rows[0];
        delete user.password;

        res.json({ message: "Profile updated successfully", user: mapUser(user) });

    } catch (err) {
        console.error("Update profile error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// -------------------- UPLOAD PROFILE PHOTO ----------------------
exports.uploadProfilePhoto = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ error: "Photo file is required" });
        }

        // Store file metadata in DB (filename, MIME type, size)
        const { filename, mimetype, size } = req.file;

        const result = await pool.query(
            `UPDATE users SET photo_filename = $1, photo_mimetype = $2, photo_size = $3, photo_updated_at = NOW() 
             WHERE id = $4 RETURNING id, firstname, lastname, email, phone, photo_filename`,
            [filename, mimetype, size, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "Profile photo uploaded successfully", user: result.rows[0] });

    } catch (err) {
        console.error("Upload photo error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- CHANGE PASSWORD -------------------------
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ error: "All fields are required" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: "New password and confirmation do not match" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long" });
        }

        // Fetch user
        const userQuery = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        const user = userQuery.rows[0];

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            "UPDATE users SET password = $1 WHERE id = $2",
            [hashedPassword, userId]
        );

        res.json({ message: "Password changed successfully" });

    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ------------------- REQUEST EMAIL VERIFICATION ------------------
exports.requestEmailVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Check if email already exists
        const existingEmail = await pool.query(
            "SELECT * FROM users WHERE email = $1 AND id != $2",
            [email, req.user.id]
        );

        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: "Email already in use" });
        }

        // Generate verification token
        const verificationToken = jwt.sign({ id: req.user.id, email }, process.env.JWT_SECRET, {
            expiresIn: "1h"
        });

        // Store token in DB for verification
        await pool.query(
            `INSERT INTO email_verifications (user_id, email, token, created_at) 
             VALUES ($1, $2, $3, NOW()) 
             ON CONFLICT (user_id) DO UPDATE SET token = $3, created_at = NOW()`,
            [req.user.id, email, verificationToken]
        );

        // TODO: Send email with verification link (using nodemailer or similar)
        // const verifyLink = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

        res.json({
            message: "Verification email sent (TODO: implement email sending)",
            // In production, remove this token from response
            verificationToken: process.env.NODE_ENV !== "production" ? verificationToken : undefined
        });

    } catch (err) {
        console.error("Request email verification error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- VERIFY NEW EMAIL -------------------------
exports.verifyNewEmail = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: "Verification token is required" });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(403).json({ error: "Invalid or expired verification token" });
        }

        // Check if token exists in DB
        const verification = await pool.query(
            "SELECT * FROM email_verifications WHERE token = $1 AND user_id = $2",
            [token, decoded.id]
        );

        if (verification.rows.length === 0) {
            return res.status(403).json({ error: "Verification token not found or already used" });
        }

        const { email } = verification.rows[0];

        // Update user email
        await pool.query(
            "UPDATE users SET email = $1, email_verified = true WHERE id = $2",
            [email, decoded.id]
        );

        // Delete used token
        await pool.query(
            "DELETE FROM email_verifications WHERE token = $1",
            [token]
        );

        res.json({ message: "Email verified and updated successfully" });

    } catch (err) {
        console.error("Verify email error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};