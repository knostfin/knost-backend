const express = require("express");
const router = express.Router();
const incomeController = require("../controllers/incomeController");
const authMiddleware = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// ---------------------- INCOME ROUTES -------------------------

/**
 * @swagger
 * /api/income:
 *   post:
 *     summary: Add income
 *     tags: [Income]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - source
 *               - amount
 *               - month_year
 *             properties:
 *               source:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               month_year:
 *                 type: string
 *                 description: Format YYYY-MM
 *               received_on:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Income added successfully
 */
router.post("/", incomeController.addIncome);

/**
 * @swagger
 * /api/income:
 *   get:
 *     summary: Get income for specified period
 *     tags: [Income]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month_year
 *         schema:
 *           type: string
 *           description: Format YYYY-MM
 *       - in: query
 *         name: start_month
 *         schema:
 *           type: string
 *           description: Format YYYY-MM (use with end_month for range)
 *       - in: query
 *         name: end_month
 *         schema:
 *           type: string
 *           description: Format YYYY-MM (use with start_month for range)
 *     responses:
 *       200:
 *         description: List of income with summary
 */
router.get("/", incomeController.getIncome);

/**
 * @swagger
 * /api/income/{id}:
 *   get:
 *     summary: Get income details
 *     tags: [Income]
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
 *         description: Income details
 */
router.get("/:id", incomeController.getIncomeDetails);

/**
 * @swagger
 * /api/income/{id}:
 *   put:
 *     summary: Update income
 *     tags: [Income]
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
 *               source:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               received_on:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Income updated successfully
 */
router.put("/:id", incomeController.updateIncome);

/**
 * @swagger
 * /api/income/{id}:
 *   delete:
 *     summary: Delete income
 *     tags: [Income]
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
 *         description: Income deleted successfully
 */
router.delete("/:id", incomeController.deleteIncome);

/**
 * @swagger
 * /api/income/sources/list:
 *   get:
 *     summary: Get all unique income sources
 *     tags: [Income]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of income sources
 */
router.get("/sources/list", incomeController.getIncomeSources);

module.exports = router;
