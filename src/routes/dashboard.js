const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const authMiddleware = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// ---------------------- DASHBOARD ROUTES -------------------------

/**
 * @swagger
 * /api/dashboard/monthly/{month_year}:
 *   get:
 *     summary: Get complete monthly overview
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: month_year
 *         required: true
 *         schema:
 *           type: string
 *         description: Format YYYY-MM
 *     responses:
 *       200:
 *         description: Complete monthly financial overview
 */
router.get("/monthly/:month_year", dashboardController.getMonthlyOverview);

/**
 * @swagger
 * /api/dashboard/transactions/{month_year}:
 *   get:
 *     summary: Get all financial activities for a month
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: month_year
 *         required: true
 *         schema:
 *           type: string
 *         description: Format YYYY-MM
 *     responses:
 *       200:
 *         description: All transactions including income, expenses, EMIs, debts
 */
router.get("/transactions/:month_year", dashboardController.getAllTransactionsForMonth);

/**
 * @swagger
 * /api/dashboard/category-breakdown/{month_year}:
 *   get:
 *     summary: Get expense breakdown by category for a month
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: month_year
 *         required: true
 *         schema:
 *           type: string
 *         description: Format YYYY-MM
 *     responses:
 *       200:
 *         description: Category breakdown with percentages
 */
router.get("/category-breakdown/:month_year", dashboardController.getExpenseCategoryBreakdown);

/**
 * @swagger
 * /api/dashboard/trends:
 *   get:
 *     summary: Get historical financial trends (real data from backend)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 6
 *         description: Number of months to retrieve (1-24)
 *     responses:
 *       200:
 *         description: Historical trends with income, expenses, EMIs, balance, and savings rate
 */
router.get("/trends", dashboardController.getHistoricalTrends);

/**
 * @swagger
 * /api/dashboard/loan-summary/{loan_id}:
 *   get:
 *     summary: Get complete loan payment summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loan_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Loan ID
 *     responses:
 *       200:
 *         description: Loan payment summary with progress and remaining amounts
 */
router.get("/loan-summary/:loan_id", dashboardController.getLoanPaymentSummary);

/**
 * @swagger
 * /api/dashboard/report/download/{month_year}:
 *   get:
 *     summary: Download monthly financial report as Excel
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: month_year
 *         required: true
 *         schema:
 *           type: string
 *         description: Format YYYY-MM
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get("/report/download/:month_year", dashboardController.downloadMonthlyReport);

module.exports = router;
