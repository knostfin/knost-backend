const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const authMiddleware = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// =====================================================
// RECURRING EXPENSE TEMPLATES ROUTES
// =====================================================

/**
 * @swagger
 * /api/expenses/recurring:
 *   post:
 *     summary: Add a recurring expense template
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - amount
 *               - start_month
 *             properties:
 *               category:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               payment_method:
 *                 type: string
 *                 enum: [cash, card, bank_transfer, upi, other]
 *               start_month:
 *                 type: string
 *                 format: date
 *                 description: Format YYYY-MM-01
 *               end_month:
 *                 type: string
 *                 format: date
 *                 description: Format YYYY-MM-01 (optional)
 *               due_day:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 31
 *     responses:
 *       201:
 *         description: Recurring expense added successfully
 */
router.post("/recurring", expenseController.addRecurringExpense);

/**
 * @swagger
 * /api/expenses/recurring/{id}:
 *   put:
 *     summary: Update a recurring expense template
 *     tags: [Expenses]
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
 *               category:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               payment_method:
 *                 type: string
 *               end_month:
 *                 type: string
 *                 format: date
 *               due_day:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Recurring expense updated successfully
 */
router.put("/recurring/:id", expenseController.updateRecurringExpense);

/**
 * @swagger
 * /api/expenses/recurring/{id}:
 *   delete:
 *     summary: Delete a recurring expense template
 *     tags: [Expenses]
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
 *         description: Recurring expense deleted successfully
 */
router.delete("/recurring/:id", expenseController.deleteRecurringExpense);

// =====================================================
// MONTHLY EXPENSES ROUTES
// =====================================================

/**
 * @swagger
 * /api/expenses/generate/{month_year}:
 *   post:
 *     summary: Generate monthly expenses from recurring templates
 *     tags: [Expenses]
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
 *       201:
 *         description: Monthly expenses generated successfully
 */
router.post("/generate/:month_year", expenseController.generateMonthlyExpenses);

/**
 * @swagger
 * /api/expenses/monthly:
 *   get:
 *     summary: Get monthly expenses
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month_year
 *         schema:
 *           type: string
 *           description: Format YYYY-MM
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid]
 *     responses:
 *       200:
 *         description: List of monthly expenses with summary
 */
router.get("/monthly", expenseController.getMonthlyExpenses);

/**
 * @swagger
 * /api/expenses/monthly:
 *   post:
 *     summary: Add a one-off monthly expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - amount
 *               - month_year
 *             properties:
 *               category:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               payment_method:
 *                 type: string
 *                 enum: [cash, card, bank_transfer, upi, other]
 *               month_year:
 *                 type: string
 *                 description: Format YYYY-MM
 *               due_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Monthly expense added successfully
 */
router.post("/monthly", expenseController.addMonthlyExpense);

/**
 * @swagger
 * /api/expenses/monthly/{id}:
 *   put:
 *     summary: Update a monthly expense
 *     tags: [Expenses]
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
 *               category:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               payment_method:
 *                 type: string
 *               due_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Monthly expense updated successfully
 */
router.put("/monthly/:id", expenseController.updateMonthlyExpense);

/**
 * @swagger
 * /api/expenses/monthly/{id}:
 *   delete:
 *     summary: Delete a monthly expense
 *     tags: [Expenses]
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
 *         description: Monthly expense deleted successfully
 */
router.delete("/monthly/:id", expenseController.deleteMonthlyExpense);

/**
 * @swagger
 * /api/expenses/monthly/{id}/mark-paid:
 *   post:
 *     summary: Mark a monthly expense as paid
 *     tags: [Expenses]
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
 *         description: Expense marked as paid
 */
router.post("/monthly/:id/mark-paid", expenseController.markExpensePaid);

module.exports = router;
