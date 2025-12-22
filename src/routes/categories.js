const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const authMiddleware = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create or update a category (upsert on name+type per user)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type]
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [income, expense, debt]
 *               icon:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category saved
 */
router.post("/", categoryController.addCategory);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get categories (optionally filter by type)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense, debt]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/", categoryController.getCategories);

module.exports = router;
