const express = require("express");
const router = express.Router();
const loanController = require("../controllers/loanController");
const authMiddleware = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// ---------------------- LOAN ROUTES -------------------------

/**
 * @swagger
 * /api/loans:
 *   post:
 *     summary: Add a new loan with automatic EMI calculation
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loan_name
 *               - principal_amount
 *               - interest_rate
 *               - tenure_months
 *             properties:
 *               loan_name:
 *                 type: string
 *               principal_amount:
 *                 type: number
 *               interest_rate:
 *                 type: number
 *               tenure_months:
 *                 type: integer
 *               start_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Loan added successfully
 */
router.post("/", loanController.addLoan);

/**
 * @swagger
 * /api/loans:
 *   get:
 *     summary: Get all loans for the user
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, closed, foreclosed]
 *     responses:
 *       200:
 *         description: List of loans with payment summary
 */
router.get("/", loanController.getLoans);

/**
 * @swagger
 * /api/loans/{id}:
 *   get:
 *     summary: Get loan details with full payment schedule
 *     tags: [Loans]
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
 *         description: Loan details with payment schedule
 */
router.get("/:id", loanController.getLoanDetails);

/**
 * @swagger
 * /api/loans/{id}:
 *   put:
 *     summary: Update loan details
 *     tags: [Loans]
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
 *               loan_name:
 *                 type: string
 *               notes:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, closed, foreclosed]
 *     responses:
 *       200:
 *         description: Loan updated successfully
 */
router.put("/:id", loanController.updateLoan);

/**
 * @swagger
 * /api/loans/{id}:
 *   delete:
 *     summary: Delete a loan
 *     tags: [Loans]
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
 *         description: Loan deleted successfully
 */
router.delete("/:id", loanController.deleteLoan);

/**
 * @swagger
 * /api/loans/{id}/close:
 *   post:
 *     summary: Close a loan
 *     tags: [Loans]
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
 *         description: Loan closed successfully
 */
router.post("/:id/close", loanController.closeLoan);

// ---------------------- LOAN PAYMENT ROUTES -------------------------

/**
 * @swagger
 * /api/loans/{id}/payments:
 *   get:
 *     summary: Get all payments for a loan
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, overdue]
 *     responses:
 *       200:
 *         description: List of loan payments
 */
router.get("/:id/payments", loanController.getLoanPayments);

/**
 * @swagger
 * /api/loans/{id}/payments/{paymentId}/mark-paid:
 *   post:
 *     summary: Mark an EMI payment as paid
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: EMI marked as paid
 */
router.post("/:id/payments/:paymentId/mark-paid", loanController.markEMIPaid);

/**
 * @swagger
 * /api/loans/monthly-due:
 *   get:
 *     summary: Get all EMIs due for a specific month
 *     tags: [Loans]
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
 *         description: Monthly EMI due list with summary
 */
router.get("/monthly-due/list", loanController.getMonthlyEMIDue);

module.exports = router;
