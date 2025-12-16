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

module.exports = router;
