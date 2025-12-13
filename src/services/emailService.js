const { Resend } = require('resend');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email verification code to user
 * @param {string} email - User's email address
 * @param {string} code - 6-digit verification code
 * @returns {Promise<boolean>} - Returns true if email sent successfully
 */
async function sendVerificationEmail(email, code) {
    try {
        const response = await resend.emails.send({
            from: 'noreply@knost.in',
            to: email,
            subject: 'Verify Your Email - Knost',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Email Verification Required</h2>
                    <p>Hello,</p>
                    <p>Use this verification code to confirm your email address:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="display: inline-block; padding: 14px 28px; background-color: #007bff; color: white; border-radius: 8px; font-size: 24px; letter-spacing: 4px; font-weight: 700;">
                            ${code}
                        </div>
                    </div>
                    <p style="text-align: center; font-size: 14px; color: #666; margin-top: -10px;">This code is valid for 60 minutes.</p>
                    
                    <p style="color: #999; font-size: 12px;">
                        If you did not request this, please ignore this email.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        Knost Finance © 2025. All rights reserved.
                    </p>
                </div>
            `,
        });

        if (response.error) {
            console.error('Resend error:', response.error);
            return false;
        }

        console.log('Verification email sent:', response.data);
        return true;
    } catch (err) {
        console.error('Error sending verification email:', err.message);
        return false;
    }
}

/**
 * Send password reset email to user
 * @param {string} email - User's email address
 * @param {string} resetToken - JWT token for password reset
 * @returns {Promise<boolean>} - Returns true if email sent successfully
 */
async function sendPasswordResetEmail(email, resetToken) {
    try {
        // Frontend expects token in path and email as query param
        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}?email=${encodeURIComponent(email)}`;

        const response = await resend.emails.send({
            from: 'noreply@knost.in',
            to: email,
            subject: 'Reset Your Password - Knost',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>Hello,</p>
                    <p>We received a request to reset your password. Click the button below to set a new password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="display: inline-block; padding: 12px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p>Or copy and paste this link in your browser:</p>
                    <p style="word-break: break-all; color: #666;">
                        <a href="${resetLink}">${resetLink}</a>
                    </p>
                    
                    <p style="color: #999; font-size: 12px;">
                        This link will expire in 1 hour.<br>
                        If you did not request this password reset, please ignore this email.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        Knost Finance © 2025. All rights reserved.
                    </p>
                </div>
            `,
        });

        if (response.error) {
            console.error('Resend error:', response.error);
            return false;
        }

        console.log('Password reset email sent:', response.data);
        return true;
    } catch (err) {
        console.error('Error sending password reset email:', err.message);
        return false;
    }
}

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
};
