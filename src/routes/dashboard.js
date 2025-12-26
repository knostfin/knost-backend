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
 * /api/dashboard/range:
 *   get:
 *     summary: Get multi-month comparison view
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_month
 *         required: true
 *         schema:
 *           type: string
 *         description: Format YYYY-MM
 *       - in: query
 *         name: end_month
 *         required: true
 *         schema:
 *           type: string
 *         description: Format YYYY-MM
 *     responses:
 *       200:
 *         description: Multi-month financial data
 */
router.get("/range", dashboardController.getMultiMonthView);

/**
 * @swagger
 * /api/dashboard/status/{month_year}:
 *   get:
 *     summary: Get monthly payment status (cleared or pending)
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
 *         description: Monthly status with pending items count
 */
router.get("/status/:month_year", dashboardController.getMonthlyStatus);

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
 *         description: All transactions including income, expenses, EMIs, debts, investments
 */
router.get("/transactions/:month_year", dashboardController.getAllTransactionsForMonth);

/**
 * @swagger
 * /api/dashboard/year/{year}:
 *   get:
 *     summary: Get yearly financial summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: Format YYYY
 *     responses:
 *       200:
 *         description: Annual financial summary
 */
router.get("/year/:year", dashboardController.getYearSummary);

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
 * /api/dashboard/summary/{month_year}:
 *   get:
 *     summary: Get detailed summary statistics for a month
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
 *         description: Detailed statistics including averages and totals
 */
router.get("/summary/:month_year", dashboardController.getSummaryStatistics);

/**
 * @swagger
 * /api/dashboard/calculate-emi:
 *   post:
 *     summary: Calculate EMI amount for a loan
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - principal_amount
 *               - annual_interest_rate
 *               - tenure_months
 *             properties:
 *               principal_amount:
 *                 type: number
 *                 example: 500000
 *                 description: Loan principal amount
 *               annual_interest_rate:
 *                 type: number
 *                 example: 8.5
 *                 description: Annual interest rate as percentage (e.g., 8.5 for 8.5%)
 *               tenure_months:
 *                 type: integer
 *                 example: 60
 *                 description: Loan tenure in months
 *     responses:
 *       200:
 *         description: EMI calculation with payment schedule
 */
router.post("/calculate-emi", dashboardController.calculateEMI);

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
