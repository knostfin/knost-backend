const pool = require("../db");

// Helper function to calculate EMI
const calculateEMI = (principal, annualRate, tenureMonths) => {
    if (annualRate === 0) {
        return (principal / tenureMonths).toFixed(2);
    }
    
    const monthlyRate = annualRate / (12 * 100);
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / 
                (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    
    return emi.toFixed(2);
};

// Helper function to generate payment schedule
const generatePaymentSchedule = (loanId, userId, principal, annualRate, tenureMonths, startDate, emiAmount) => {
    const payments = [];
    const monthlyRate = annualRate / (12 * 100);
    let outstandingBalance = parseFloat(principal);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    
    for (let i = 1; i <= tenureMonths; i++) {
        const interestPaid = outstandingBalance * monthlyRate;
        const principalPaid = parseFloat(emiAmount) - interestPaid;
        outstandingBalance -= principalPaid;
        
        // Calculate payment date (add i months to start date)
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + i);
        const paymentDateStr = paymentDate.toISOString().split('T')[0];
        
        // Auto-mark as paid if payment date is before today
        const isPast = paymentDate < today;
        
        payments.push({
            loan_id: loanId,
            user_id: userId,
            payment_number: i,
            payment_date: paymentDateStr,
            emi_amount: parseFloat(emiAmount),
            principal_paid: principalPaid.toFixed(2),
            interest_paid: interestPaid.toFixed(2),
            outstanding_balance: Math.max(0, outstandingBalance).toFixed(2),
            status: isPast ? 'paid' : 'pending',
            paid_on: isPast ? paymentDateStr : null
        });
    }
    
    return payments;
};

// ======================== NEW HELPERS ========================
// Helper function to generate EMI expenses from loan payment schedule
const generateEMIExpenses = async (client, loanId, userId, loanName, paymentSchedule) => {
    try {
        for (const payment of paymentSchedule) {
            const [year, month] = payment.payment_date.split('-');
            const monthYear = `${year}-${month}`;
            
            // Use same status and paid_on from payment schedule
            const expenseStatus = payment.status;
            const paidOn = payment.paid_on;
            
            await client.query(
                `INSERT INTO monthly_expenses 
                 (user_id, loan_id, loan_payment_id, is_emi, category, amount, description, payment_method, month_year, due_date, status, paid_on)
                 VALUES ($1, $2, (SELECT id FROM loan_payments WHERE loan_id = $3 AND payment_number = $4), 
                         true, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    userId,
                    loanId,
                    loanId,
                    payment.payment_number,
                    `EMI - ${loanName}`,
                    payment.emi_amount,
                    `EMI Payment #${payment.payment_number} - ${loanName}`,
                    'bank_transfer',
                    monthYear,
                    payment.payment_date,
                    expenseStatus,
                    paidOn
                ]
            );
        }
        console.log(`Generated ${paymentSchedule.length} EMI expense entries for loan ${loanId}`);
    } catch (err) {
        console.error("Error generating EMI expenses:", err);
        throw err;
    }
};

// Helper function to delete pending EMI expenses when loan is deleted/closed
const deletePendingEMIExpenses = async (client, loanId) => {
    try {
        const result = await client.query(
            `DELETE FROM monthly_expenses 
             WHERE loan_id = $1 AND status = 'pending' AND is_emi = true
             RETURNING id`,
            [loanId]
        );
        console.log(`Deleted ${result.rows.length} pending EMI expenses for loan ${loanId}`);
        return result.rows.length;
    } catch (err) {
        console.error("Error deleting pending EMI expenses:", err);
        throw err;
    }
};

// Helper function to update EMI expense status when payment is marked
const updateEMIExpenseStatus = async (client, loanPaymentId, status) => {
    try {
        const paidOn = status === 'paid' ? new Date().toISOString() : null;
        
        const result = await client.query(
            `UPDATE monthly_expenses 
             SET status = $1, paid_on = $2, updated_at = NOW()
             WHERE loan_payment_id = $3 AND is_emi = true
             RETURNING id`,
            [status, paidOn, loanPaymentId]
        );
         
        if (result.rows.length > 0) {
            console.log(`Updated EMI expense status to ${status} for payment ${loanPaymentId}`);
        }
        return result.rows.length;
    } catch (err) {
        console.error("Error updating EMI expense status:", err);
        throw err;
    }
};

// ---------------------- ADD LOAN -------------------------
exports.addLoan = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.id;
        let { loan_name, principal_amount, interest_rate, tenure_months, start_date, notes } = req.body;

        // ⚠️ CRITICAL: Convert string numbers to proper decimals
        principal_amount = parseFloat(principal_amount);
        interest_rate = parseFloat(interest_rate);
        tenure_months = parseInt(tenure_months, 10);

        // Validation
        if (!loan_name || isNaN(principal_amount) || principal_amount <= 0) {
            return res.status(400).json({ 
                error: "Loan name and valid principal amount are required",
                debug: { principal_amount, type: typeof principal_amount }
            });
        }

        if (!tenure_months || isNaN(tenure_months) || tenure_months <= 0) {
            return res.status(400).json({ error: "Valid tenure in months is required" });
        }

        if (isNaN(interest_rate) || interest_rate < 0) {
            return res.status(400).json({ error: "Valid interest rate is required" });
        }

        // Calculate EMI
        const emiAmount = calculateEMI(principal_amount, interest_rate, tenure_months);

        // Calculate end date
        const startDateObj = start_date ? new Date(start_date) : new Date();
        const endDateObj = new Date(startDateObj);
        endDateObj.setMonth(endDateObj.getMonth() + parseInt(tenure_months));

        await client.query('BEGIN');

        // Insert loan
        const loanResult = await client.query(
            `INSERT INTO loans (user_id, loan_name, principal_amount, interest_rate, tenure_months, emi_amount, start_date, end_date, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
             RETURNING *`,
            [userId, loan_name, principal_amount, interest_rate, tenure_months, emiAmount, 
             startDateObj.toISOString().split('T')[0], endDateObj.toISOString().split('T')[0], notes || null]
        );

        const loan = loanResult.rows[0];

        // Generate payment schedule
        const paymentSchedule = generatePaymentSchedule(
            loan.id, userId, principal_amount, interest_rate, tenure_months, startDateObj, emiAmount
        );

        // Insert all payments
        for (const payment of paymentSchedule) {
            await client.query(
                `INSERT INTO loan_payments (loan_id, user_id, payment_number, payment_date, emi_amount, principal_paid, interest_paid, outstanding_balance, status, paid_on)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [payment.loan_id, payment.user_id, payment.payment_number, payment.payment_date, 
                 payment.emi_amount, payment.principal_paid, payment.interest_paid, payment.outstanding_balance, payment.status, payment.paid_on]
            );
        }

        // ✨ NEW: Generate EMI expenses (auto-create monthly expenses from payment schedule)
        await generateEMIExpenses(client, loan.id, userId, loan_name, paymentSchedule);

        await client.query('COMMIT');

        const formatted = pool.formatRows([loan])[0];
        const paidCount = paymentSchedule.filter(p => p.status === 'paid').length;
        const pendingCount = paymentSchedule.filter(p => p.status === 'pending').length;
        
        res.status(201).json({
            message: "Loan added successfully with payment schedule and monthly EMI expenses generated",
            loan: formatted,
            emi_expenses_count: paymentSchedule.length,
            past_payments_marked_paid: paidCount,
            future_payments_pending: pendingCount
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Add loan error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    } finally {
        client.release();
    }
};

// ---------------------- GET ALL LOANS -------------------------
exports.getLoans = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.query;

        let query = "SELECT * FROM loans WHERE user_id = $1";
        const params = [userId];

        if (status && ['active', 'closed', 'foreclosed'].includes(status)) {
            query += " AND status = $2";
            params.push(status);
        }

        query += " ORDER BY created_at DESC";

        const result = await pool.query(query, params);
        const formattedLoans = pool.formatRows(result.rows);

        // Get payment summary for each loan
        const loansWithSummary = await Promise.all(formattedLoans.map(async (loan) => {
            const paymentSummary = await pool.query(
                `SELECT 
                    COUNT(*) as total_payments,
                    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                    SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_count,
                    SUM(CASE WHEN status = 'paid' THEN emi_amount ELSE 0 END) as total_paid
                FROM loan_payments WHERE loan_id = $1`,
                [loan.id]
            );

            return {
                ...loan,
                payment_summary: paymentSummary.rows[0]
            };
        }));

        res.json({ loans: loansWithSummary });
    } catch (err) {
        console.error("Get loans error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- UPDATE LOAN -------------------------
exports.updateLoan = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { loan_name, notes, status } = req.body;

        // Check ownership
        const checkQuery = await pool.query(
            "SELECT * FROM loans WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (checkQuery.rows.length === 0) {
            return res.status(404).json({ error: "Loan not found" });
        }

        const result = await pool.query(
            `UPDATE loans 
             SET loan_name = COALESCE($1, loan_name),
                 notes = COALESCE($2, notes),
                 status = COALESCE($3, status),
                 updated_at = NOW()
             WHERE id = $4 AND user_id = $5
             RETURNING *`,
            [loan_name, notes, status, id, userId]
        );

        const formatted = pool.formatRows([result.rows[0]])[0];
        res.json({
            message: "Loan updated successfully",
            loan: formatted
        });
    } catch (err) {
        console.error("Update loan error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- CLOSE LOAN -------------------------
exports.closeLoan = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.id;
        const { id } = req.params;

        await client.query('BEGIN');

        // ✨ NEW: Delete pending EMI expenses when closing loan
        const deletedCount = await deletePendingEMIExpenses(client, id);

        const result = await client.query(
            "UPDATE loans SET status = 'closed', updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Loan not found" });
        }

        await client.query('COMMIT');

        const formatted = pool.formatRows([result.rows[0]])[0];
        res.json({
            message: "Loan closed successfully",
            loan: formatted,
            pending_emi_expenses_deleted: deletedCount
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Close loan error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    } finally {
        client.release();
    }
};

// ---------------------- MARK EMI AS PAID -------------------------
exports.markEMIPaid = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.id;
        const { id, paymentId } = req.params;

        // Verify loan ownership
        const loanCheck = await client.query(
            "SELECT id FROM loans WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (loanCheck.rows.length === 0) {
            return res.status(404).json({ error: "Loan not found" });
        }

        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE loan_payments 
             SET status = 'paid', paid_on = NOW()
             WHERE id = $1 AND loan_id = $2
             RETURNING *`,
            [paymentId, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Payment not found" });
        }

        // ✨ NEW: Also update corresponding monthly expense status
        await updateEMIExpenseStatus(client, paymentId, 'paid');

        await client.query('COMMIT');

        const formatted = pool.formatRows([result.rows[0]])[0];
        res.json({
            message: "EMI marked as paid and expense updated",
            payment: formatted
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Mark EMI paid error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    } finally {
        client.release();
    }
};

// ---------------------- GET MONTHLY EMI DUE -------------------------
exports.getMonthlyEMIDue = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month_year } = req.query; // Format: YYYY-MM

        let dateFilter = "";
        const params = [userId];

        if (month_year) {
            // Get payments for specific month
            dateFilter = "AND TO_CHAR(payment_date, 'YYYY-MM') = $2";
            params.push(month_year);
        } else {
            // Get current month by default
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            dateFilter = "AND TO_CHAR(payment_date, 'YYYY-MM') = $2";
            params.push(currentMonth);
        }

        const result = await pool.query(
            `SELECT lp.*, l.loan_name 
             FROM loan_payments lp
             JOIN loans l ON lp.loan_id = l.id
             WHERE lp.user_id = $1 ${dateFilter}
             ORDER BY lp.payment_date ASC`,
            params
        );

        // Calculate summary
        const summary = {
            total_emis: result.rows.length,
            paid: result.rows.filter(p => p.status === 'paid').length,
            pending: result.rows.filter(p => p.status === 'pending').length,
            overdue: result.rows.filter(p => p.status === 'overdue').length,
            total_amount: result.rows.reduce((sum, p) => sum + parseFloat(p.emi_amount), 0),
            paid_amount: result.rows.filter(p => p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.emi_amount), 0)
        };

        res.json({
            payments: result.rows,
            summary: summary
        });
    } catch (err) {
        console.error("Get monthly EMI due error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- DELETE LOAN -------------------------
exports.deleteLoan = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.id;
        const { id } = req.params;

        await client.query('BEGIN');

        // ✨ NEW: Delete pending EMI expenses when deleting loan
        const deletedCount = await deletePendingEMIExpenses(client, id);

        const result = await client.query(
            "DELETE FROM loans WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Loan not found" });
        }

        await client.query('COMMIT');

        res.json({ 
            message: "Loan deleted successfully",
            pending_emi_expenses_deleted: deletedCount
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Delete loan error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    } finally {
        client.release();
    }
};
