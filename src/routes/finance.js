const express = require("express");
const router = express.Router();
const financeController = require("../controllers/financeController");
const authMiddleware = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// Transactions
/**
 * @swagger
 * /api/finance/transactions:
 *   get:
 *     summary: Get transactions with optional filters
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense, debt]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Transactions list with summary
 */
router.get("/transactions", financeController.getTransactions);
/**
 * @swagger
 * /api/finance/transactions:
 *   post:
 *     summary: Add a transaction
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [income, expense, debt]
 *               category:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, bank_transfer, upi, other]
 *     responses:
 *       201:
 *         description: Transaction added
 */
router.post("/transactions", financeController.addTransaction);
/**
 * @swagger
 * /api/finance/transactions/{id}:
 *   put:
 *     summary: Update a transaction
 *     tags: [Finance]
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
 *               type:
 *                 type: string
 *                 enum: [income, expense, debt]
 *               category:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, bank_transfer, upi, other]
 *     responses:
 *       200:
 *         description: Transaction updated
 */
router.put("/transactions/:id", financeController.updateTransaction);
/**
 * @swagger
 * /api/finance/transactions/{id}:
 *   delete:
 *     summary: Delete a transaction
 *     tags: [Finance]
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
 *         description: Transaction deleted
 */
router.delete("/transactions/:id", financeController.deleteTransaction);

// Analytics
/**
 * @swagger
 * /api/finance/category-breakdown:
 *   get:
 *     summary: Get category breakdown totals
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense, debt]
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *     responses:
 *       200:
 *         description: Category breakdown
 */
router.get("/category-breakdown", financeController.getCategoryBreakdown);
/**
 * @swagger
 * /api/finance/monthly-trend:
 *   get:
 *     summary: Get monthly trend totals
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 6
 *     responses:
 *       200:
 *         description: Monthly trends
 */
router.get("/monthly-trend", financeController.getMonthlyTrend);

module.exports = router;
