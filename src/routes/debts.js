const express = require("express");
const router = express.Router();
const debtController = require("../controllers/debtController");
const authMiddleware = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// ---------------------- DEBT ROUTES -------------------------

/**
 * @swagger
 * /api/debts:
 *   post:
 *     summary: Add a new debt
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - debt_name
 *               - total_amount
 *             properties:
 *               debt_name:
 *                 type: string
 *               total_amount:
 *                 type: number
 *               creditor:
 *                 type: string
 *               due_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Debt added successfully
 */
router.post("/", debtController.addDebt);

/**
 * @swagger
 * /api/debts:
 *   get:
 *     summary: Get all debts for the user
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, partially_paid, paid]
 *     responses:
 *       200:
 *         description: List of debts
 */
router.get("/", debtController.getDebts);

/**
 * @swagger
 * /api/debts/monthly-due:
 *   get:
 *     summary: Get debts due for a specific month
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month_year
 *         schema:
 *           type: string
 *           description: Format YYYY-MM, defaults to current month
 *     responses:
 *       200:
 *         description: Monthly debts due with summary
 */
router.get("/monthly-due", debtController.getMonthlyDebtsDue);
// Legacy/alternate path
router.get("/monthly-due/list", debtController.getMonthlyDebtsDue);

/**
 * @swagger
 * /api/debts/{id}:
 *   get:
 *     summary: Get debt details
 *     tags: [Debts]
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
 *         description: Debt details
 */
router.get("/:id", debtController.getDebtDetails);

/**
 * @swagger
 * /api/debts/{id}:
 *   put:
 *     summary: Update debt details
 *     tags: [Debts]
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
 *               debt_name:
 *                 type: string
 *               total_amount:
 *                 type: number
 *               creditor:
 *                 type: string
 *               due_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Debt updated successfully
 */
router.put("/:id", debtController.updateDebt);

/**
 * @swagger
 * /api/debts/{id}:
 *   delete:
 *     summary: Delete a debt
 *     tags: [Debts]
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
 *         description: Debt deleted successfully
 */
router.delete("/:id", debtController.deleteDebt);

/**
 * @swagger
 * /api/debts/{id}/pay:
 *   post:
 *     summary: Mark debt as paid (fully or partially)
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount_paid:
 *                 type: number
 *                 description: Amount paid (omit to mark as fully paid)
 *     responses:
 *       200:
 *         description: Debt payment recorded
 */
router.post("/:id/pay", debtController.markDebtPaid);

module.exports = router;
