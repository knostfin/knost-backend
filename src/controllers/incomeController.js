const pool = require("../db");

// ---------------------- ADD INCOME -------------------------
exports.addIncome = async (req, res) => {
    try {
        const userId = req.user.id;
        let { source, amount, description, month_year, received_on } = req.body;

        // ⚠️ CRITICAL: Convert string numbers to proper decimals
        amount = parseFloat(amount);

        // Validation
        if (!source || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ 
                error: "Source and valid amount are required",
                debug: { amount, type: typeof amount }
            });
        }

        if (!month_year || !/^\d{4}-\d{2}$/.test(month_year)) {
            return res.status(400).json({ error: "Invalid month_year format. Use YYYY-MM" });
        }

        const receivedDate = received_on || `${month_year}-01`;

        const result = await pool.query(
            `INSERT INTO income (user_id, source, amount, description, month_year, received_on)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userId, source, amount, description || null, month_year, receivedDate]
        );

        const formatted = pool.formatRows([result.rows[0]])[0];
        res.status(201).json({
            message: "Income added successfully",
            income: formatted
        });
    } catch (err) {
        console.error("Add income error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET INCOME -------------------------
exports.getIncome = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month_year, start_month, end_month } = req.query;

        let query = "SELECT * FROM income WHERE user_id = $1";
        const params = [userId];
        let paramCount = 1;

        if (month_year) {
            // Get income for specific month
            paramCount++;
            query += ` AND month_year = $${paramCount}`;
            params.push(month_year);
        } else if (start_month && end_month) {
            // Get income for date range
            paramCount++;
            query += ` AND month_year >= $${paramCount}`;
            params.push(start_month);
            
            paramCount++;
            query += ` AND month_year <= $${paramCount}`;
            params.push(end_month);
        }

        query += " ORDER BY received_on DESC, created_at DESC";

        const result = await pool.query(query, params);
        const formatted = pool.formatRows(result.rows);

        // Calculate summary
        const summary = {
            total_income: formatted.reduce((sum, i) => sum + parseFloat(i.amount), 0),
            count: formatted.length
        };

        res.json({ 
            income: formatted,
            summary: summary
        });
    } catch (err) {
        console.error("Get income error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- UPDATE INCOME -------------------------
exports.updateIncome = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { source, amount, description, received_on } = req.body;

        // Check ownership
        const checkQuery = await pool.query(
            "SELECT * FROM income WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (checkQuery.rows.length === 0) {
            return res.status(404).json({ error: "Income not found" });
        }

        const result = await pool.query(
            `UPDATE income 
             SET source = COALESCE($1, source),
                 amount = COALESCE($2, amount),
                 description = COALESCE($3, description),
                 received_on = COALESCE($4, received_on),
                 updated_at = NOW()
             WHERE id = $5 AND user_id = $6
             RETURNING *`,
            [source, amount, description, received_on, id, userId]
        );

        const formatted = pool.formatRows([result.rows[0]])[0];
        res.json({
            message: "Income updated successfully",
            income: formatted
        });
    } catch (err) {
        console.error("Update income error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- DELETE INCOME -------------------------
exports.deleteIncome = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM income WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Income not found" });
        }

        res.json({ message: "Income deleted successfully" });
    } catch (err) {
        console.error("Delete income error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};
