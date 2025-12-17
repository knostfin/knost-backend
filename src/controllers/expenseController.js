const pool = require("../db");

// =====================================================
// RECURRING EXPENSE TEMPLATES
// =====================================================

// ---------------------- ADD RECURRING EXPENSE -------------------------
exports.addRecurringExpense = async (req, res) => {
    try {
        const userId = req.user.id;
        const { category, amount, description, payment_method, start_month, end_month, due_day } = req.body;

        // Validation
        if (!category || !amount || amount <= 0) {
            return res.status(400).json({ error: "Category and valid amount are required" });
        }

        if (!start_month) {
            return res.status(400).json({ error: "Start month is required (format: YYYY-MM-01)" });
        }

        const result = await pool.query(
            `INSERT INTO recurring_expenses (user_id, category, amount, description, payment_method, start_month, end_month, due_day, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
             RETURNING *`,
            [userId, category, amount, description || null, payment_method || 'cash', 
             start_month, end_month || null, due_day || 1]
        );

        res.status(201).json({
            message: "Recurring expense added successfully",
            expense: result.rows[0]
        });
    } catch (err) {
        console.error("Add recurring expense error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET RECURRING EXPENSES -------------------------
exports.getRecurringExpenses = async (req, res) => {
    try {
        const userId = req.user.id;
        const { is_active } = req.query;

        let query = "SELECT * FROM recurring_expenses WHERE user_id = $1";
        const params = [userId];

        if (is_active !== undefined) {
            query += " AND is_active = $2";
            params.push(is_active === 'true');
        }

        query += " ORDER BY category ASC";

        const result = await pool.query(query, params);

        res.json({ recurring_expenses: result.rows });
    } catch (err) {
        console.error("Get recurring expenses error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- UPDATE RECURRING EXPENSE -------------------------
exports.updateRecurringExpense = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { category, amount, description, payment_method, end_month, due_day, is_active } = req.body;

        // Check ownership
        const checkQuery = await pool.query(
            "SELECT * FROM recurring_expenses WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (checkQuery.rows.length === 0) {
            return res.status(404).json({ error: "Recurring expense not found" });
        }

        const result = await pool.query(
            `UPDATE recurring_expenses 
             SET category = COALESCE($1, category),
                 amount = COALESCE($2, amount),
                 description = COALESCE($3, description),
                 payment_method = COALESCE($4, payment_method),
                 end_month = COALESCE($5, end_month),
                 due_day = COALESCE($6, due_day),
                 is_active = COALESCE($7, is_active),
                 updated_at = NOW()
             WHERE id = $8 AND user_id = $9
             RETURNING *`,
            [category, amount, description, payment_method, end_month, due_day, is_active, id, userId]
        );

        res.json({
            message: "Recurring expense updated successfully",
            expense: result.rows[0]
        });
    } catch (err) {
        console.error("Update recurring expense error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- DELETE RECURRING EXPENSE -------------------------
exports.deleteRecurringExpense = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM recurring_expenses WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Recurring expense not found" });
        }

        res.json({ message: "Recurring expense deleted successfully" });
    } catch (err) {
        console.error("Delete recurring expense error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// =====================================================
// MONTHLY EXPENSES
// =====================================================

// ---------------------- GENERATE MONTHLY EXPENSES -------------------------
exports.generateMonthlyExpenses = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.id;
        const { month_year } = req.params; // Format: YYYY-MM

        if (!month_year || !/^\d{4}-\d{2}$/.test(month_year)) {
            return res.status(400).json({ error: "Invalid month_year format. Use YYYY-MM" });
        }

        // Check if expenses already generated for this month
        const existingCheck = await client.query(
            `SELECT COUNT(*) as count FROM monthly_expenses 
             WHERE user_id = $1 AND month_year = $2 AND recurring_expense_id IS NOT NULL`,
            [userId, month_year]
        );

        if (parseInt(existingCheck.rows[0].count) > 0) {
            return res.status(400).json({ error: "Monthly expenses already generated for this month" });
        }

        // Get active recurring expenses
        const monthDate = `${month_year}-01`;
        const recurringExpenses = await client.query(
            `SELECT * FROM recurring_expenses 
             WHERE user_id = $1 
             AND is_active = true 
             AND start_month <= $2
             AND (end_month IS NULL OR end_month >= $2)`,
            [userId, monthDate]
        );

        if (recurringExpenses.rows.length === 0) {
            return res.status(200).json({ 
                message: "No active recurring expenses found",
                generated: []
            });
        }

        await client.query('BEGIN');

        const generatedExpenses = [];

        // Generate monthly expense for each recurring expense
        for (const recurring of recurringExpenses.rows) {
            // Calculate due date
            const [year, month] = month_year.split('-');
            const dueDay = Math.min(recurring.due_day, new Date(year, month, 0).getDate()); // Handle months with fewer days
            const dueDate = `${year}-${month}-${String(dueDay).padStart(2, '0')}`;

            const result = await client.query(
                `INSERT INTO monthly_expenses 
                 (user_id, recurring_expense_id, category, amount, description, payment_method, month_year, due_date, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
                 RETURNING *`,
                [userId, recurring.id, recurring.category, recurring.amount, recurring.description, 
                 recurring.payment_method, month_year, dueDate]
            );

            generatedExpenses.push(result.rows[0]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: `${generatedExpenses.length} monthly expenses generated successfully`,
            expenses: generatedExpenses
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Generate monthly expenses error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    } finally {
        client.release();
    }
};

// ---------------------- GET MONTHLY EXPENSES -------------------------
exports.getMonthlyExpenses = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month_year, status } = req.query;

        let query = "SELECT * FROM monthly_expenses WHERE user_id = $1";
        const params = [userId];
        let paramCount = 1;

        if (month_year) {
            paramCount++;
            // Guard against legacy rows whose month_year was saved incorrectly by also checking due_date month
            query += ` AND (month_year = $${paramCount} OR TO_CHAR(due_date, 'YYYY-MM') = $${paramCount})`;
            params.push(month_year);
        }

        if (status && ['pending', 'paid'].includes(status)) {
            paramCount++;
            query += ` AND status = $${paramCount}`;
            params.push(status);
        }

        query += " ORDER BY due_date ASC, created_at DESC";

        const result = await pool.query(query, params);

        // Calculate summary
        const summary = {
            total_expenses: result.rows.length,
            pending: result.rows.filter(e => e.status === 'pending').length,
            paid: result.rows.filter(e => e.status === 'paid').length,
            total_amount: result.rows.reduce((sum, e) => sum + parseFloat(e.amount), 0),
            paid_amount: result.rows.filter(e => e.status === 'paid').reduce((sum, e) => sum + parseFloat(e.amount), 0),
            pending_amount: result.rows.filter(e => e.status === 'pending').reduce((sum, e) => sum + parseFloat(e.amount), 0)
        };

        res.json({ 
            expenses: result.rows,
            summary: summary
        });
    } catch (err) {
        console.error("Get monthly expenses error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- ADD MONTHLY EXPENSE (One-off) -------------------------
exports.addMonthlyExpense = async (req, res) => {
    try {
        const userId = req.user.id;
        const { category, amount, description, payment_method, month_year, due_date } = req.body;

        // Validation
        if (!category || !amount || amount <= 0) {
            return res.status(400).json({ error: "Category and valid amount are required" });
        }

        if (!month_year || !/^\d{4}-\d{2}$/.test(month_year)) {
            return res.status(400).json({ error: "Invalid month_year format. Use YYYY-MM" });
        }

        if (due_date && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
            return res.status(400).json({ error: "Invalid due_date format. Use YYYY-MM-DD" });
        }

        const normalizedDueDate = due_date || `${month_year}-01`;
        const normalizedMonthYear = normalizedDueDate.slice(0, 7);

        const result = await pool.query(
            `INSERT INTO monthly_expenses 
             (user_id, category, amount, description, payment_method, month_year, due_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
             RETURNING *`,
            [userId, category, amount, description || null, payment_method || 'cash', 
             normalizedMonthYear, normalizedDueDate]
        );

        res.status(201).json({
            message: "Monthly expense added successfully",
            expense: result.rows[0]
        });
    } catch (err) {
        console.error("Add monthly expense error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- UPDATE MONTHLY EXPENSE -------------------------
exports.updateMonthlyExpense = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { category, amount, description, payment_method, due_date } = req.body;

        // Check ownership
        const checkQuery = await pool.query(
            "SELECT * FROM monthly_expenses WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (checkQuery.rows.length === 0) {
            return res.status(404).json({ error: "Monthly expense not found" });
        }

        const toMonthYear = (value) => {
            if (!value) return null;
            if (typeof value === 'string') return value.slice(0, 7);
            try { return value.toISOString().slice(0, 7); } catch (e) { return null; }
        };

        const existing = checkQuery.rows[0];
        const nextDueDate = due_date || existing.due_date;
        const nextMonthYear = toMonthYear(due_date) || toMonthYear(existing.due_date) || existing.month_year;

        if (due_date && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
            return res.status(400).json({ error: "Invalid due_date format. Use YYYY-MM-DD" });
        }

        const result = await pool.query(
            `UPDATE monthly_expenses 
             SET category = COALESCE($1, category),
                 amount = COALESCE($2, amount),
                 description = COALESCE($3, description),
                 payment_method = COALESCE($4, payment_method),
                 due_date = $5,
                 month_year = $6,
                 updated_at = NOW()
             WHERE id = $7 AND user_id = $8
             RETURNING *`,
            [category, amount, description, payment_method, nextDueDate, nextMonthYear, id, userId]
        );

        res.json({
            message: "Monthly expense updated successfully",
            expense: result.rows[0]
        });
    } catch (err) {
        console.error("Update monthly expense error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- MARK EXPENSE AS PAID -------------------------
exports.markExpensePaid = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE monthly_expenses 
             SET status = 'paid', paid_on = NOW(), updated_at = NOW()
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Monthly expense not found" });
        }

        res.json({
            message: "Expense marked as paid",
            expense: result.rows[0]
        });
    } catch (err) {
        console.error("Mark expense paid error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- DELETE MONTHLY EXPENSE -------------------------
exports.deleteMonthlyExpense = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM monthly_expenses WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Monthly expense not found" });
        }

        res.json({ message: "Monthly expense deleted successfully" });
    } catch (err) {
        console.error("Delete monthly expense error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET EXPENSE CATEGORIES -------------------------
exports.getExpenseCategories = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get unique categories from both recurring and monthly expenses
        const result = await pool.query(
            `SELECT DISTINCT category FROM (
                SELECT category FROM recurring_expenses WHERE user_id = $1
                UNION
                SELECT category FROM monthly_expenses WHERE user_id = $1
            ) AS categories
            ORDER BY category ASC`,
            [userId]
        );

        res.json({ categories: result.rows.map(r => r.category) });
    } catch (err) {
        console.error("Get expense categories error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};
