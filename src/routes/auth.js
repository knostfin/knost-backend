const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");
const authMiddleware = require("../middlewares/authMiddleware");
const { upload } = require("../middlewares/uploadMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refreshToken);
router.get("/verify", authController.verifyToken);
router.post("/logout", authController.logout);

// Protected routes (require auth token)
router.get("/profile", authMiddleware, authController.getProfile);
router.put("/profile", authMiddleware, authController.updateProfile);
router.post("/profile/photo", authMiddleware, upload.single('photo'), authController.uploadProfilePhoto);
router.post("/change-password", authMiddleware, authController.changePassword);
router.post("/request-email-verify", authMiddleware, authController.requestEmailVerification);
router.post("/verify-email", authMiddleware, authController.verifyNewEmail); // Protected to match code flow
router.post("/request-otp", authController.requestOtp);
router.post("/verify-otp", authController.verifyOtp);

module.exports = router;