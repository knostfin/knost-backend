const pool = require("../db");

// ---------------------- ADD DEBT -------------------------
exports.addDebt = async (req, res) => {
    try {
        const userId = req.user.id;
        let { debt_name, total_amount, creditor, due_date, notes } = req.body;

        // ⚠️ CRITICAL: Convert string numbers to proper decimals
        total_amount = parseFloat(total_amount);

        // Validation
        if (!debt_name || isNaN(total_amount) || total_amount <= 0) {
            return res.status(400).json({ 
                error: "Debt name and valid amount are required",
                debug: { total_amount, type: typeof total_amount }
            });
        }

        const result = await pool.query(
            `INSERT INTO debts (user_id, debt_name, total_amount, creditor, due_date, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending')
             RETURNING *`,
            [userId, debt_name, total_amount, creditor || null, due_date || null, notes || null]
        );

        const formatted = pool.formatRows([result.rows[0]])[0];
        res.status(201).json({
            message: "Debt added successfully",
            debt: formatted
        });
    } catch (err) {
        console.error("Add debt error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET ALL DEBTS -------------------------
exports.getDebts = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.query;

        let query = "SELECT * FROM debts WHERE user_id = $1";
        const params = [userId];

        if (status && ['pending', 'partially_paid', 'paid'].includes(status)) {
            query += " AND status = $2";
            params.push(status);
        }

        query += " ORDER BY due_date ASC NULLS LAST, created_at DESC";

        const result = await pool.query(query, params);
        const formatted = pool.formatRows(result.rows);

        res.json({ debts: formatted });
    } catch (err) {
        console.error("Get debts error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET DEBT DETAILS -------------------------
exports.getDebtDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const debtId = parseInt(id, 10);

        if (Number.isNaN(debtId)) {
            return res.status(400).json({ error: "Invalid debt id" });
        }

        const result = await pool.query(
            "SELECT * FROM debts WHERE id = $1 AND user_id = $2",
            [debtId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Debt not found" });
        }

        const formatted = pool.formatRows([result.rows[0]])[0];
        res.json({ debt: formatted });
    } catch (err) {
        console.error("Get debt details error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- UPDATE DEBT -------------------------
exports.updateDebt = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const debtId = parseInt(id, 10);
        const { debt_name, total_amount, creditor, due_date, notes } = req.body;

        if (Number.isNaN(debtId)) {
            return res.status(400).json({ error: "Invalid debt id" });
        }

        // Check ownership
        const checkQuery = await pool.query(
            "SELECT * FROM debts WHERE id = $1 AND user_id = $2",
            [debtId, userId]
        );

        if (checkQuery.rows.length === 0) {
            return res.status(404).json({ error: "Debt not found" });
        }

        const result = await pool.query(
            `UPDATE debts 
             SET debt_name = COALESCE($1, debt_name),
                 total_amount = COALESCE($2, total_amount),
                 creditor = COALESCE($3, creditor),
                 due_date = COALESCE($4, due_date),
                 notes = COALESCE($5, notes),
                 updated_at = NOW()
             WHERE id = $6 AND user_id = $7
             RETURNING *`,
            [debt_name, total_amount, creditor, due_date, notes, debtId, userId]
        );

        res.json({
            message: "Debt updated successfully",
            debt: result.rows[0]
        });
    } catch (err) {
        console.error("Update debt error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- MARK DEBT AS PAID -------------------------
exports.markDebtPaid = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const debtId = parseInt(id, 10);
        const { amount_paid } = req.body; // Can be partial or full payment

        if (Number.isNaN(debtId)) {
            return res.status(400).json({ error: "Invalid debt id" });
        }

        // Get current debt
        const debtQuery = await pool.query(
            "SELECT * FROM debts WHERE id = $1 AND user_id = $2",
            [debtId, userId]
        );

        if (debtQuery.rows.length === 0) {
            return res.status(404).json({ error: "Debt not found" });
        }

        const debt = debtQuery.rows[0];
        const currentPaid = parseFloat(debt.amount_paid) || 0;
        const totalAmount = parseFloat(debt.total_amount);
        
        let newAmountPaid = currentPaid;
        let newStatus = debt.status;

        if (amount_paid !== undefined) {
            // Partial payment
            newAmountPaid = currentPaid + parseFloat(amount_paid);
            
            if (newAmountPaid >= totalAmount) {
                newStatus = 'paid';
                newAmountPaid = totalAmount;
            } else {
                newStatus = 'partially_paid';
            }
        } else {
            // Mark as fully paid
            newAmountPaid = totalAmount;
            newStatus = 'paid';
        }

        const result = await pool.query(
            `UPDATE debts 
             SET amount_paid = $1, status = $2, updated_at = NOW()
             WHERE id = $3 AND user_id = $4
             RETURNING *`,
            [newAmountPaid, newStatus, debtId, userId]
        );

        res.json({
            message: newStatus === 'paid' ? "Debt marked as fully paid" : "Partial payment recorded",
            debt: result.rows[0]
        });
    } catch (err) {
        console.error("Mark debt paid error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- DELETE DEBT -------------------------
exports.deleteDebt = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const debtId = parseInt(id, 10);

        if (Number.isNaN(debtId)) {
            return res.status(400).json({ error: "Invalid debt id" });
        }

        const result = await pool.query(
            "DELETE FROM debts WHERE id = $1 AND user_id = $2 RETURNING *",
            [debtId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Debt not found" });
        }

        res.json({ message: "Debt deleted successfully" });
    } catch (err) {
        console.error("Delete debt error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET MONTHLY DEBTS DUE -------------------------
exports.getMonthlyDebtsDue = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month_year } = req.query; // Format: YYYY-MM

        let dateFilter = "";
        const params = [userId];

        if (month_year) {
            dateFilter = "AND TO_CHAR(due_date, 'YYYY-MM') = $2";
            params.push(month_year);
        } else {
            // Get current month by default
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            dateFilter = "AND TO_CHAR(due_date, 'YYYY-MM') = $2";
            params.push(currentMonth);
        }

        const result = await pool.query(
            `SELECT * FROM debts 
             WHERE user_id = $1 ${dateFilter}
             AND status != 'paid'
             ORDER BY due_date ASC`,
            params
        );

        const summary = {
            total_debts: result.rows.length,
            total_amount: result.rows.reduce((sum, d) => sum + (parseFloat(d.total_amount) - parseFloat(d.amount_paid || 0)), 0)
        };

        res.json({
            debts: result.rows,
            summary: summary
        });
    } catch (err) {
        console.error("Get monthly debts due error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};
