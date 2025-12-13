const pool = require("../db");

// ---------------------- GET ALL TRANSACTIONS -------------------------
exports.getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { period, type, startDate, endDate } = req.query;

        let query = "SELECT * FROM transactions WHERE user_id = $1";
        const params = [userId];
        let paramCount = 1;

        // Filter by type
        if (type && ["income", "expense", "debt"].includes(type)) {
            paramCount++;
            query += ` AND type = $${paramCount}`;
            params.push(type);
        }

        // Filter by period
        if (period) {
            const now = new Date();
            let dateFilter;

            switch (period) {
                case "week":
                    dateFilter = new Date(now.setDate(now.getDate() - 7));
                    break;
                case "month":
                    dateFilter = new Date(now.setMonth(now.getMonth() - 1));
                    break;
                case "year":
                    dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
                    break;
            }

            if (dateFilter) {
                paramCount++;
                query += ` AND transaction_date >= $${paramCount}`;
                params.push(dateFilter.toISOString().split("T")[0]);
            }
        }

        // Custom date range
        if (startDate && endDate) {
            paramCount++;
            query += ` AND transaction_date BETWEEN $${paramCount}`;
            params.push(startDate);
            paramCount++;
            query += ` AND $${paramCount}`;
            params.push(endDate);
        }

        query += " ORDER BY transaction_date DESC, created_at DESC LIMIT 100";

        const result = await pool.query(query, params);

        // Calculate summary
        const summaryQuery = await pool.query(
            `SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
                SUM(CASE WHEN type = 'debt' THEN amount ELSE 0 END) as total_debt
            FROM transactions WHERE user_id = $1`,
            [userId]
        );

        const summary = summaryQuery.rows[0];
        const balance =
            parseFloat(summary.total_income || 0) -
            parseFloat(summary.total_expense || 0);

        res.json({
            transactions: result.rows,
            summary: {
                income: parseFloat(summary.total_income || 0),
                expense: parseFloat(summary.total_expense || 0),
                debt: parseFloat(summary.total_debt || 0),
                balance: balance,
            },
        });
    } catch (err) {
        console.error("Get transactions error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- ADD TRANSACTION -------------------------
exports.addTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, category, amount, description, date, paymentMethod } =
            req.body;

        // Validation
        if (!type || !["income", "expense", "debt"].includes(type)) {
            return res.status(400).json({ error: "Invalid transaction type" });
        }

        if (!category || !amount || amount <= 0) {
            return res.status(400).json({
                error: "Category and valid amount are required",
            });
        }

        const transactionDate =
            date || new Date().toISOString().split("T")[0];

        const result = await pool.query(
            `INSERT INTO transactions (user_id, type, category, amount, description, transaction_date, payment_method)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                userId,
                type,
                category,
                amount,
                description || null,
                transactionDate,
                paymentMethod || "cash",
            ]
        );

        console.log(
            `✅ Transaction added: ${type} - ${category} - ${amount}`
        );

        res.status(201).json({
            message: "Transaction added successfully",
            transaction: result.rows[0],
        });
    } catch (err) {
        console.error("Add transaction error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- UPDATE TRANSACTION -------------------------
exports.updateTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { type, category, amount, description, date, paymentMethod } =
            req.body;

        // Check ownership
        const checkQuery = await pool.query(
            "SELECT * FROM transactions WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (checkQuery.rows.length === 0) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        const result = await pool.query(
            `UPDATE transactions 
             SET type = COALESCE($1, type),
                 category = COALESCE($2, category),
                 amount = COALESCE($3, amount),
                 description = COALESCE($4, description),
                 transaction_date = COALESCE($5, transaction_date),
                 payment_method = COALESCE($6, payment_method),
                 updated_at = NOW()
             WHERE id = $7 AND user_id = $8
             RETURNING *`,
            [type, category, amount, description, date, paymentMethod, id, userId]
        );

        res.json({
            message: "Transaction updated successfully",
            transaction: result.rows[0],
        });
    } catch (err) {
        console.error("Update transaction error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- DELETE TRANSACTION -------------------------
exports.deleteTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        console.log(`✅ Transaction deleted: ${id}`);

        res.json({ message: "Transaction deleted successfully" });
    } catch (err) {
        console.error("Delete transaction error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET CATEGORY BREAKDOWN -------------------------
exports.getCategoryBreakdown = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, period } = req.query;

        let dateFilter = "";
        if (period) {
            const now = new Date();
            let dateFrom;

            switch (period) {
                case "week":
                    dateFrom = new Date(now.setDate(now.getDate() - 7));
                    break;
                case "month":
                    dateFrom = new Date(now.setMonth(now.getMonth() - 1));
                    break;
                case "year":
                    dateFrom = new Date(now.setFullYear(now.getFullYear() - 1));
                    break;
            }

            if (dateFrom) {
                dateFilter = `AND transaction_date >= '${
                    dateFrom.toISOString().split("T")[0]
                }'`;
            }
        }

        const typeFilter = type ? `AND type = '${type}'` : "";

        const result = await pool.query(
            `SELECT category, type, SUM(amount) as total, COUNT(*) as count
             FROM transactions 
             WHERE user_id = $1 ${typeFilter} ${dateFilter}
             GROUP BY category, type
             ORDER BY total DESC`,
            [userId]
        );

        res.json({ breakdown: result.rows });
    } catch (err) {
        console.error("Category breakdown error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET MONTHLY TREND -------------------------
exports.getMonthlyTrend = async (req, res) => {
    try {
        const userId = req.user.id;
        const { months = 6 } = req.query;

        const result = await pool.query(
            `SELECT 
                TO_CHAR(transaction_date, 'YYYY-MM') as month,
                type,
                SUM(amount) as total
             FROM transactions 
             WHERE user_id = $1 
                AND transaction_date >= NOW() - INTERVAL '${parseInt(
                    months
                )} months'
             GROUP BY month, type
             ORDER BY month DESC`,
            [userId]
        );

        res.json({ trend: result.rows });
    } catch (err) {
        console.error("Monthly trend error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};
