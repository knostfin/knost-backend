const pool = require("../db");

// ---------------------- ADD INVESTMENT -------------------------
exports.addInvestment = async (req, res) => {
    try {
        const userId = req.user.id;
        let { investment_type, name, amount, invested_on, maturity_date, notes } = req.body;

        // ⚠️ CRITICAL: Convert string numbers to proper decimals
        amount = parseFloat(amount);

        // Validation
        if (!investment_type || !name || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ 
                error: "Investment type, name, and valid amount are required",
                debug: { amount, type: typeof amount }
            });
        }

        const validTypes = ['mutual_fund', 'stocks', 'savings', 'fd', 'ppf', 'gold', 'real_estate', 'crypto', 'other'];
        if (!validTypes.includes(investment_type)) {
            return res.status(400).json({ error: "Invalid investment type" });
        }

        // Get local date without timezone conversion (YYYY-MM-DD)
        const investedDate = invested_on || new Date().toLocaleDateString('en-CA');

        const result = await pool.query(
            `INSERT INTO investments (user_id, investment_type, name, amount, invested_on, maturity_date, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
             RETURNING *`,
            [userId, investment_type, name, amount, investedDate, maturity_date || null, notes || null]
        );

        const formatted = pool.formatRows([result.rows[0]])[0];
        res.status(201).json({
            message: "Investment added successfully",
            investment: formatted
        });
    } catch (err) {
        console.error("Add investment error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET INVESTMENTS -------------------------
exports.getInvestments = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, investment_type } = req.query;

        let query = "SELECT * FROM investments WHERE user_id = $1";
        const params = [userId];
        let paramCount = 1;

        if (status && ['active', 'matured', 'sold'].includes(status)) {
            paramCount++;
            query += ` AND status = $${paramCount}`;
            params.push(status);
        }

        if (investment_type) {
            paramCount++;
            query += ` AND investment_type = $${paramCount}`;
            params.push(investment_type);
        }

        query += " ORDER BY invested_on DESC, created_at DESC";

        const result = await pool.query(query, params);
        const formatted = pool.formatRows(result.rows);

        // Calculate summary
        const summary = {
            total_investments: formatted.length,
            total_invested: formatted.reduce((sum, i) => sum + parseFloat(i.amount), 0),
            current_value: formatted.reduce((sum, i) => sum + parseFloat(i.current_value || i.amount), 0),
            total_returns: formatted.reduce((sum, i) => sum + parseFloat(i.returns || 0), 0),
            active: formatted.filter(i => i.status === 'active').length,
            matured: formatted.filter(i => i.status === 'matured').length
        };

        res.json({ 
            investments: formatted,
            summary: summary
        });
    } catch (err) {
        console.error("Get investments error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET INVESTMENT DETAILS -------------------------
exports.getInvestmentDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await pool.query(
            "SELECT * FROM investments WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Investment not found" });
        }

        const formatted = pool.formatRows([result.rows[0]])[0];
        res.json({ investment: formatted });
    } catch (err) {
        console.error("Get investment details error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- UPDATE INVESTMENT -------------------------
exports.updateInvestment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { name, maturity_date, current_value, returns, status, notes } = req.body;

        // Check ownership
        const checkQuery = await pool.query(
            "SELECT * FROM investments WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (checkQuery.rows.length === 0) {
            return res.status(404).json({ error: "Investment not found" });
        }

        const result = await pool.query(
            `UPDATE investments 
             SET name = COALESCE($1, name),
                 maturity_date = COALESCE($2, maturity_date),
                 current_value = COALESCE($3, current_value),
                 returns = COALESCE($4, returns),
                 status = COALESCE($5, status),
                 notes = COALESCE($6, notes),
                 updated_at = NOW()
             WHERE id = $7 AND user_id = $8
             RETURNING *`,
            [name, maturity_date, current_value, returns, status, notes, id, userId]
        );

        const formatted = pool.formatRows([result.rows[0]])[0];
        res.json({
            message: "Investment updated successfully",
            investment: formatted
        });
    } catch (err) {
        console.error("Update investment error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- DELETE INVESTMENT -------------------------
exports.deleteInvestment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM investments WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Investment not found" });
        }

        res.json({ message: "Investment deleted successfully" });
    } catch (err) {
        console.error("Delete investment error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET INVESTMENT TYPES BREAKDOWN -------------------------
exports.getInvestmentTypeBreakdown = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT 
                investment_type,
                COUNT(*) as count,
                SUM(amount) as total_invested,
                SUM(COALESCE(current_value, amount)) as total_current_value,
                SUM(COALESCE(returns, 0)) as total_returns
             FROM investments 
             WHERE user_id = $1 AND status = 'active'
             GROUP BY investment_type
             ORDER BY total_invested DESC`,
            [userId]
        );

        res.json({ breakdown: result.rows });
    } catch (err) {
        console.error("Get investment type breakdown error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};
