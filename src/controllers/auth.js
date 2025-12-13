const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../services/emailService");
const { blacklistToken } = require("../services/tokenBlacklistService");
const { sanitizeUser, devLog } = require("../utils/security");
const { uploadToCloudinary, deleteFromCloudinary } = require("../services/cloudinaryService");

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

// Generate access token
function generateAccessToken(user) {
    return jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "15m", // Reduced from 1h to 15m
    });
}

// Generate refresh token
function generateRefreshToken(user) {
    return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
    });
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Shape DB user row into response with both snake_case and camelCase keys
function mapUser(row) {
    if (!row) return null;
    
    // Construct full Cloudinary URL if photo exists
    let photoUrl = null;
    if (row.photo_filename && row.photo_public_id) {
        // Use the full Cloudinary URL pattern
        photoUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${row.photo_public_id}.jpg`;
    }
    
    return {
        id: row.id,
        firstname: row.firstname,
        lastname: row.lastname,
        email: row.email,
        phone: row.phone,
        countryCode: row.country_code,
        createdAt: row.created_at,
        lastLogin: row.last_login,
        photoUrl: photoUrl,  // Return full URL instead of filename
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
        const accessToken = req.headers.authorization?.split(" ")[1];

        if (!refreshToken) {
            return res.status(400).json({ error: "Refresh token required" });
        }

        // Blacklist the access token if provided
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
                const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
                
                if (expiresIn > 0) {
                    // Only blacklist if token hasn't expired yet
                    await blacklistToken(accessToken, expiresIn);
                }
            } catch (err) {
                // Token already invalid/expired, no need to blacklist
                console.log("Access token already invalid:", err.message);
            }
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

// ---------------------- REQUEST OTP -------------------------
exports.requestOtp = async (req, res) => {
    try {
        const { phone, countryCode } = req.body;

        if (!phone) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        // Check if user exists
        const userQuery = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: "Phone number not registered" });
        }

        // Format phone number with country code (required for Twilio)
        const formattedPhone = phone.startsWith('+') ? phone : `${countryCode || '+91'}${phone}`;

        if (twilioClient && process.env.TWILIO_VERIFY_SERVICE_SID) {
            // Use Twilio Verify API
            try {
                const verification = await twilioClient.verify.v2
                    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
                    .verifications
                    .create({ to: formattedPhone, channel: 'sms' });

                res.json({
                    message: "OTP sent to your phone",
                    status: verification.status
                });
            } catch (twilioErr) {
                console.error("Twilio error:", twilioErr.message);
                return res.status(500).json({ 
                    error: "Failed to send OTP", 
                    details: twilioErr.message 
                });
            }
        } else {
            // Fallback: Store OTP in database (for development/testing)
            const otp = generateOTP();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

            await pool.query(
                `INSERT INTO phone_otps (phone, otp, expires_at)
                 VALUES ($1, $2, $3)`,
                [phone, otp, expiresAt]
            );

            // Log OTP for development debugging only
            devLog(`Phone OTP for ${formattedPhone}`, otp);

            res.json({
                message: "OTP sent to your phone"
            });
        }

    } catch (err) {
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- VERIFY OTP -------------------------
exports.verifyOtp = async (req, res) => {
    try {
        const { phone, otp, countryCode } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ error: "Phone and OTP are required" });
        }

        // Fetch user first
        const userQuery = await pool.query(
            "SELECT * FROM users WHERE phone = $1",
            [phone]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = userQuery.rows[0];

        // Format phone number with country code
        const formattedPhone = phone.startsWith('+') ? phone : `${countryCode || '+91'}${phone}`;

        if (twilioClient && process.env.TWILIO_VERIFY_SERVICE_SID) {
            // Use Twilio Verify API
            try {
                const verificationCheck = await twilioClient.verify.v2
                    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
                    .verificationChecks
                    .create({ to: formattedPhone, code: otp });

                if (verificationCheck.status !== 'approved') {
                    return res.status(400).json({ error: "Invalid or expired OTP" });
                }
            } catch (twilioErr) {
                console.error("Twilio verification error:", twilioErr.message);
                return res.status(400).json({ 
                    error: "Invalid or expired OTP", 
                    details: twilioErr.message 
                });
            }
        } else {
            // Fallback: Check OTP from database
            const otpCheck = await pool.query(
                `SELECT * FROM phone_otps 
                 WHERE phone = $1 AND otp = $2 
                 ORDER BY created_at DESC LIMIT 1`,
                [phone, otp]
            );

            if (otpCheck.rows.length === 0) {
                return res.status(400).json({ error: "Invalid OTP" });
            }

            const otpRecord = otpCheck.rows[0];

            if (new Date() > otpRecord.expires_at) {
                return res.status(400).json({ error: "OTP expired" });
            }

            // Delete OTP after successful verification
            await pool.query("DELETE FROM phone_otps WHERE phone = $1", [phone]);
        }

        // Generate tokens
        const accessToken = generateAccessToken({
            id: user.id,
            email: user.email,
            phone: user.phone,
            firstname: user.firstname,
            lastname: user.lastname,
        });

        const refreshToken = generateRefreshToken({ id: user.id });

        await pool.query(
            "INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)",
            [user.id, refreshToken]
        );

        // Update last_login
        await pool.query(
            "UPDATE users SET last_login = NOW() WHERE id = $1",
            [user.id]
        );

        res.json({
            message: "OTP verified, login successful",
            token: accessToken,
            refreshToken,
            user: mapUser(user)
        });

    } catch (err) {
        res.status(500).json({ error: "Server error", details: err.message });
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

        // Validate file size
        const maxSizeBytes = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxSizeBytes) {
            return res.status(400).json({
                error: `File size exceeds 5MB limit. Current size: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`
            });
        }

        if (req.file.size < 10 * 1024) {
            return res.status(400).json({
                error: "File size must be at least 10KB"
            });
        }

        // Get existing photo public ID if any (for deletion)
        const userResult = await pool.query(
            "SELECT photo_public_id FROM users WHERE id = $1",
            [userId]
        );
        const oldPhotoPublicId = userResult.rows[0]?.photo_public_id;

        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(
            req.file.buffer,
            `knost/profiles`,
            `user-${userId}-profile`
        );

        // Delete old photo if exists
        if (oldPhotoPublicId) {
            try {
                await deleteFromCloudinary(oldPhotoPublicId);
            } catch (err) {
                console.error("Failed to delete old photo:", err.message);
                // Continue anyway, old photo will just remain in Cloudinary
            }
        }

        // Update user with new photo URL
        const result = await pool.query(
            `UPDATE users 
             SET photo_filename = $1, photo_url = $2, photo_public_id = $3, photo_size = $4, photo_updated_at = NOW() 
             WHERE id = $5
             RETURNING id, firstname, lastname, email, phone, photo_url`,
            [
                `user-${userId}-profile`,
                uploadResult.url,
                uploadResult.publicId,
                uploadResult.size,
                userId
            ]
        );

        res.json({
            message: "Profile photo uploaded successfully",
            user: result.rows[0],
            photo: {
                url: uploadResult.url,
                size: uploadResult.size,
                uploadedAt: uploadResult.uploadedAt
            }
        });

    } catch (err) {
        console.error("Upload photo error:", err);
        res.status(500).json({
            error: "Failed to upload photo",
            details: err.message
        });
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

        // Generate 6-digit verification code (valid for ~1 hour via created_at)
        const verificationCode = generateOTP();

        // Store code in DB for verification (no expiration needed - one-time use)
        await pool.query(
            `INSERT INTO email_verifications (user_id, email, token, created_at) 
             VALUES ($1, $2, $3, NOW()) 
             ON CONFLICT (user_id) DO UPDATE SET 
               token = $3, 
               created_at = NOW()`,
            [req.user.id, email, verificationCode]
        );
        console.log(`Stored verification code in DB for user ${req.user.id}, email: ${email}`);

        // Send verification email with code (frontend expects 6-digit input)
        const emailSent = await sendVerificationEmail(email, verificationCode);

        if (!emailSent) {
            return res.status(500).json({ 
                error: "Failed to send verification email. Please try again later." 
            });
        }

        // Log verification code for development debugging only
        devLog(`Email verification code for ${email}`, verificationCode);

        res.json({
            message: "Verification code sent successfully. Please check your inbox."
        });

    } catch (err) {
        console.error("Request email verification error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- VERIFY NEW EMAIL -------------------------
exports.verifyNewEmail = async (req, res) => {
    try {
        const code = req.body.code || req.body.verificationCode || req.body.token || req.body.otp;

        if (!code) {
            return res.status(400).json({ error: "Verification code is required" });
        }

        // Require authenticated user (same as requestEmailVerification)
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Find and delete the verification code in one atomic operation
        const verification = await pool.query(
            `DELETE FROM email_verifications 
             WHERE user_id = $1 AND token = $2 
             RETURNING email`,
            [userId, code]
        );

        if (verification.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired verification code" });
        }

        const { email } = verification.rows[0];

        // Update user email
        await pool.query(
            "UPDATE users SET email = $1, email_verified = true WHERE id = $2",
            [email, userId]
        );

        res.json({ message: "Email verified and updated successfully" });

    } catch (err) {
        console.error("Verify email error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- FORGOT PASSWORD -------------------------
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        // Check if user exists
        const userQuery = await pool.query(
            "SELECT id, email, firstname FROM users WHERE email = $1",
            [email]
        );

        if (userQuery.rows.length === 0) {
            // Don't reveal if email exists (security best practice)
            return res.json({ 
                message: "If this email exists in our system, you will receive a password reset link" 
            });
        }

        const user = userQuery.rows[0];

        // Generate reset token
        const resetToken = require('crypto').randomBytes(32).toString('hex');

        // Delete any existing reset tokens for this user
        await pool.query(
            "DELETE FROM password_resets WHERE user_id = $1",
            [user.id]
        );

        // Store reset token (expires in 1 hour)
        await pool.query(
            `INSERT INTO password_resets (user_id, email, token, expires_at)
             VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')`,
            [user.id, email, resetToken]
        );

        // Send email with reset link using proper email service
        const emailSent = await sendPasswordResetEmail(email, resetToken);

        if (!emailSent) {
            return res.status(500).json({ 
                error: "Failed to send password reset email. Please try again later." 
            });
        }

        console.log(`✅ Password reset email sent to ${email}`);

        res.json({ 
            message: "If this email exists in our system, you will receive a password reset link" 
        });

    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- RESET PASSWORD -------------------------
exports.resetPassword = async (req, res) => {
    try {
        const { token, email, newPassword, confirmPassword } = req.body;

        if (!token || !email || !newPassword || !confirmPassword) {
            return res.status(400).json({ error: "All fields are required" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long" });
        }

        // Find valid reset token
        const resetQuery = await pool.query(
            `SELECT * FROM password_resets 
             WHERE token = $1 AND email = $2 AND expires_at > NOW()`,
            [token, email]
        );

        if (resetQuery.rows.length === 0) {
            return res.status(400).json({ 
                error: "Invalid or expired reset token. Please request a new password reset." 
            });
        }

        const resetRecord = resetQuery.rows[0];
        const userId = resetRecord.user_id;

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await pool.query(
            "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
            [hashedPassword, userId]
        );

        // Delete used reset token
        await pool.query(
            "DELETE FROM password_resets WHERE id = $1",
            [resetRecord.id]
        );

        console.log(`✅ Password reset successful for user ${userId}`);

        res.json({ message: "Password reset successfully. You can now login with your new password." });

    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};