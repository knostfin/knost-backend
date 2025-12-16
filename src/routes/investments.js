const express = require("express");
const router = express.Router();
const investmentController = require("../controllers/investmentController");
const authMiddleware = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// ---------------------- INVESTMENT ROUTES -------------------------

/**
 * @swagger
 * /api/investments:
 *   post:
 *     summary: Add a new investment
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - investment_type
 *               - name
 *               - amount
 *             properties:
 *               investment_type:
 *                 type: string
 *                 enum: [mutual_fund, stocks, savings, fd, ppf, gold, real_estate, crypto, other]
 *               name:
 *                 type: string
 *               amount:
 *                 type: number
 *               invested_on:
 *                 type: string
 *                 format: date
 *               maturity_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Investment added successfully
 */
router.post("/", investmentController.addInvestment);

/**
 * @swagger
 * /api/investments:
 *   get:
 *     summary: Get all investments
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, matured, sold]
 *       - in: query
 *         name: investment_type
 *         schema:
 *           type: string
 *           enum: [mutual_fund, stocks, savings, fd, ppf, gold, real_estate, crypto, other]
 *     responses:
 *       200:
 *         description: List of investments with summary
 */
router.get("/", investmentController.getInvestments);

/**
 * @swagger
 * /api/investments/{id}:
 *   get:
 *     summary: Get investment details
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Investment details
 */
router.get("/:id", investmentController.getInvestmentDetails);

/**
 * @swagger
 * /api/investments/{id}:
 *   put:
 *     summary: Update investment details
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               maturity_date:
 *                 type: string
 *                 format: date
 *               current_value:
 *                 type: number
 *               returns:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, matured, sold]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Investment updated successfully
 */
router.put("/:id", investmentController.updateInvestment);

/**
 * @swagger
 * /api/investments/{id}:
 *   delete:
 *     summary: Delete an investment
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Investment deleted successfully
 */
router.delete("/:id", investmentController.deleteInvestment);

/**
 * @swagger
 * /api/investments/breakdown/types:
 *   get:
 *     summary: Get investment breakdown by type
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Investment type breakdown
 */
router.get("/breakdown/types", investmentController.getInvestmentTypeBreakdown);

module.exports = router;
