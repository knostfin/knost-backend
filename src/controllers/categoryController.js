const pool = require("../db");

// POST /api/categories
exports.addCategory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, type, icon } = req.body;

        if (!name || !type || !["income", "expense", "debt"].includes(type)) {
            return res.status(400).json({ error: "name and valid type (income|expense|debt) are required" });
        }

        const result = await pool.query(
            `INSERT INTO categories (user_id, name, type, icon)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, name, type) DO UPDATE SET icon = EXCLUDED.icon
             RETURNING *`,
            [userId, name.trim(), type, icon || null]
        );

        res.status(201).json({ message: "Category saved", category: result.rows[0] });
    } catch (err) {
        console.error("Add category error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// GET /api/categories
exports.getCategories = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type } = req.query;

        let query = "SELECT * FROM categories WHERE user_id = $1";
        const params = [userId];

        if (type && ["income", "expense", "debt"].includes(type)) {
            query += " AND type = $2";
            params.push(type);
        }

        query += " ORDER BY type ASC, name ASC";

        const result = await pool.query(query, params);

        res.json({ categories: result.rows });
    } catch (err) {
        console.error("Get categories error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};
