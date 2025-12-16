const pool = require("../db");

// ---------------------- GET MONTHLY OVERVIEW -------------------------
exports.getMonthlyOverview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month_year } = req.params; // Format: YYYY-MM

        if (!month_year || !/^\d{4}-\d{2}$/.test(month_year)) {
            return res.status(400).json({ error: "Invalid month_year format. Use YYYY-MM" });
        }

        // Get Income
        const incomeResult = await pool.query(
            `SELECT SUM(amount) as total_income, COUNT(*) as income_count
             FROM income WHERE user_id = $1 AND month_year = $2`,
            [userId, month_year]
        );

        // Get Monthly Expenses
        const expensesResult = await pool.query(
            `SELECT 
                COUNT(*) as total_count,
                SUM(amount) as total_amount,
                SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
                SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
             FROM monthly_expenses WHERE user_id = $1 AND month_year = $2`,
            [userId, month_year]
        );

        // Get EMIs for the month
        const emisResult = await pool.query(
            `SELECT 
                COUNT(*) as total_count,
                SUM(emi_amount) as total_amount,
                SUM(CASE WHEN status = 'paid' THEN emi_amount ELSE 0 END) as paid_amount,
                SUM(CASE WHEN status = 'pending' THEN emi_amount ELSE 0 END) as pending_amount,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
             FROM loan_payments 
             WHERE user_id = $1 AND TO_CHAR(payment_date, 'YYYY-MM') = $2`,
            [userId, month_year]
        );

        // Get Debts due in this month
        const debtsResult = await pool.query(
            `SELECT 
                COUNT(*) as total_count,
                SUM(total_amount - COALESCE(amount_paid, 0)) as total_amount
             FROM debts 
             WHERE user_id = $1 
             AND TO_CHAR(due_date, 'YYYY-MM') = $2
             AND status != 'paid'`,
            [userId, month_year]
        );

        // Get Investments made in this month
        const investmentsResult = await pool.query(
            `SELECT 
                COUNT(*) as count,
                SUM(amount) as total_amount
             FROM investments 
             WHERE user_id = $1 AND TO_CHAR(invested_on, 'YYYY-MM') = $2`,
            [userId, month_year]
        );

        const income = parseFloat(incomeResult.rows[0].total_income || 0);
        const expensesTotal = parseFloat(expensesResult.rows[0].total_amount || 0);
        const expensesPaid = parseFloat(expensesResult.rows[0].paid_amount || 0);
        const expensesPending = parseFloat(expensesResult.rows[0].pending_amount || 0);
        
        const emisTotal = parseFloat(emisResult.rows[0].total_amount || 0);
        const emisPaid = parseFloat(emisResult.rows[0].paid_amount || 0);
        const emisPending = parseFloat(emisResult.rows[0].pending_amount || 0);
        
        const debtsTotal = parseFloat(debtsResult.rows[0].total_amount || 0);
        const investmentsTotal = parseFloat(investmentsResult.rows[0].total_amount || 0);

        const totalPaid = expensesPaid + emisPaid;
        const totalPending = expensesPending + emisPending + debtsTotal;
        const balance = income - totalPaid - investmentsTotal;

        const overview = {
            month_year: month_year,
            income: {
                total: income,
                count: parseInt(incomeResult.rows[0].income_count || 0)
            },
            expenses: {
                total: expensesTotal,
                paid: expensesPaid,
                pending: expensesPending,
                paid_count: parseInt(expensesResult.rows[0].paid_count || 0),
                pending_count: parseInt(expensesResult.rows[0].pending_count || 0)
            },
            emis: {
                total: emisTotal,
                paid: emisPaid,
                pending: emisPending,
                paid_count: parseInt(emisResult.rows[0].paid_count || 0),
                pending_count: parseInt(emisResult.rows[0].pending_count || 0)
            },
            debts: {
                total: debtsTotal,
                count: parseInt(debtsResult.rows[0].total_count || 0)
            },
            investments: {
                total: investmentsTotal,
                count: parseInt(investmentsResult.rows[0].count || 0)
            },
            summary: {
                total_income: income,
                total_paid: totalPaid,
                total_pending: totalPending,
                total_investments: investmentsTotal,
                balance: balance,
                is_cleared: totalPending === 0
            }
        };

        res.json({ overview });
    } catch (err) {
        console.error("Get monthly overview error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET MULTI-MONTH VIEW -------------------------
exports.getMultiMonthView = async (req, res) => {
    try {
        const userId = req.user.id;
        const { start_month, end_month } = req.query;

        if (!start_month || !end_month) {
            return res.status(400).json({ error: "start_month and end_month are required (format: YYYY-MM)" });
        }

        // Get income for each month
        const incomeResult = await pool.query(
            `SELECT 
                month_year,
                SUM(amount) as total_income,
                COUNT(*) as count
             FROM income 
             WHERE user_id = $1 AND month_year BETWEEN $2 AND $3
             GROUP BY month_year
             ORDER BY month_year ASC`,
            [userId, start_month, end_month]
        );

        // Get expenses for each month
        const expensesResult = await pool.query(
            `SELECT 
                month_year,
                SUM(amount) as total_expenses,
                SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid,
                SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending
             FROM monthly_expenses 
             WHERE user_id = $1 AND month_year BETWEEN $2 AND $3
             GROUP BY month_year
             ORDER BY month_year ASC`,
            [userId, start_month, end_month]
        );

        // Get EMIs for each month
        const emisResult = await pool.query(
            `SELECT 
                TO_CHAR(payment_date, 'YYYY-MM') as month_year,
                SUM(emi_amount) as total_emis,
                SUM(CASE WHEN status = 'paid' THEN emi_amount ELSE 0 END) as paid,
                SUM(CASE WHEN status = 'pending' THEN emi_amount ELSE 0 END) as pending
             FROM loan_payments 
             WHERE user_id = $1 
             AND TO_CHAR(payment_date, 'YYYY-MM') BETWEEN $2 AND $3
             GROUP BY month_year
             ORDER BY month_year ASC`,
            [userId, start_month, end_month]
        );

        // Combine data month by month
        const monthsData = {};
        
        // Generate all months in range
        const startDate = new Date(start_month + '-01');
        const endDate = new Date(end_month + '-01');
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const monthKey = currentDate.toISOString().slice(0, 7);
            monthsData[monthKey] = {
                month_year: monthKey,
                income: 0,
                expenses: 0,
                emis: 0,
                balance: 0
            };
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        // Fill in income data
        incomeResult.rows.forEach(row => {
            if (monthsData[row.month_year]) {
                monthsData[row.month_year].income = parseFloat(row.total_income || 0);
            }
        });

        // Fill in expenses data
        expensesResult.rows.forEach(row => {
            if (monthsData[row.month_year]) {
                monthsData[row.month_year].expenses = parseFloat(row.total_expenses || 0);
            }
        });

        // Fill in EMIs data
        emisResult.rows.forEach(row => {
            if (monthsData[row.month_year]) {
                monthsData[row.month_year].emis = parseFloat(row.total_emis || 0);
            }
        });

        // Calculate balance for each month
        Object.keys(monthsData).forEach(month => {
            const data = monthsData[month];
            data.balance = data.income - data.expenses - data.emis;
        });

        const monthsArray = Object.values(monthsData).sort((a, b) => 
            a.month_year.localeCompare(b.month_year)
        );

        res.json({ months: monthsArray });
    } catch (err) {
        console.error("Get multi-month view error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET MONTHLY STATUS -------------------------
exports.getMonthlyStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month_year } = req.params;

        if (!month_year || !/^\d{4}-\d{2}$/.test(month_year)) {
            return res.status(400).json({ error: "Invalid month_year format. Use YYYY-MM" });
        }

        // Check pending expenses
        const expensesPending = await pool.query(
            `SELECT COUNT(*) as count FROM monthly_expenses 
             WHERE user_id = $1 AND month_year = $2 AND status = 'pending'`,
            [userId, month_year]
        );

        // Check pending EMIs
        const emisPending = await pool.query(
            `SELECT COUNT(*) as count FROM loan_payments 
             WHERE user_id = $1 
             AND TO_CHAR(payment_date, 'YYYY-MM') = $2 
             AND status = 'pending'`,
            [userId, month_year]
        );

        // Check unpaid debts
        const debtsPending = await pool.query(
            `SELECT COUNT(*) as count FROM debts 
             WHERE user_id = $1 
             AND TO_CHAR(due_date, 'YYYY-MM') = $2 
             AND status != 'paid'`,
            [userId, month_year]
        );

        const totalPending = parseInt(expensesPending.rows[0].count || 0) +
                           parseInt(emisPending.rows[0].count || 0) +
                           parseInt(debtsPending.rows[0].count || 0);

        const status = {
            month_year: month_year,
            is_cleared: totalPending === 0,
            pending_items: totalPending,
            details: {
                pending_expenses: parseInt(expensesPending.rows[0].count || 0),
                pending_emis: parseInt(emisPending.rows[0].count || 0),
                pending_debts: parseInt(debtsPending.rows[0].count || 0)
            }
        };

        res.json({ status });
    } catch (err) {
        console.error("Get monthly status error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET ALL TRANSACTIONS FOR MONTH -------------------------
exports.getAllTransactionsForMonth = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month_year } = req.params;

        if (!month_year || !/^\d{4}-\d{2}$/.test(month_year)) {
            return res.status(400).json({ error: "Invalid month_year format. Use YYYY-MM" });
        }

        // Get all income
        const income = await pool.query(
            `SELECT id, source as name, amount, received_on as date, 'income' as type, description, created_at
             FROM income WHERE user_id = $1 AND month_year = $2`,
            [userId, month_year]
        );

        // Get all expenses
        const expenses = await pool.query(
            `SELECT id, category as name, amount, due_date as date, 'expense' as type, 
                    description, status, payment_method, created_at
             FROM monthly_expenses WHERE user_id = $1 AND month_year = $2`,
            [userId, month_year]
        );

        // Get all EMIs
        const emis = await pool.query(
            `SELECT lp.id, l.loan_name as name, lp.emi_amount as amount, 
                    lp.payment_date as date, 'emi' as type, lp.status, lp.created_at
             FROM loan_payments lp
             JOIN loans l ON lp.loan_id = l.id
             WHERE lp.user_id = $1 AND TO_CHAR(lp.payment_date, 'YYYY-MM') = $2`,
            [userId, month_year]
        );

        // Get debts due in this month
        const debts = await pool.query(
            `SELECT id, debt_name as name, (total_amount - COALESCE(amount_paid, 0)) as amount, 
                    due_date as date, 'debt' as type, status, creditor, created_at
             FROM debts 
             WHERE user_id = $1 
             AND TO_CHAR(due_date, 'YYYY-MM') = $2
             AND status != 'paid'`,
            [userId, month_year]
        );

        // Get investments made in this month
        const investments = await pool.query(
            `SELECT id, name, amount, invested_on as date, 'investment' as type, 
                    investment_type, status, created_at
             FROM investments WHERE user_id = $1 AND TO_CHAR(invested_on, 'YYYY-MM') = $2`,
            [userId, month_year]
        );

        // Combine all transactions
        const allTransactions = [
            ...income.rows,
            ...expenses.rows,
            ...emis.rows,
            ...debts.rows,
            ...investments.rows
        ].sort((a, b) => {
            const dateA = new Date(a.date || a.created_at);
            const dateB = new Date(b.date || b.created_at);
            return dateB - dateA;
        });

        res.json({
            month_year: month_year,
            total_items: allTransactions.length,
            transactions: allTransactions
        });
    } catch (err) {
        console.error("Get all transactions for month error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET YEAR SUMMARY -------------------------
exports.getYearSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const { year } = req.params;

        if (!year || !/^\d{4}$/.test(year)) {
            return res.status(400).json({ error: "Invalid year format. Use YYYY" });
        }

        // Get yearly income
        const incomeResult = await pool.query(
            `SELECT SUM(amount) as total FROM income 
             WHERE user_id = $1 AND month_year LIKE $2`,
            [userId, `${year}-%`]
        );

        // Get yearly expenses
        const expensesResult = await pool.query(
            `SELECT SUM(amount) as total FROM monthly_expenses 
             WHERE user_id = $1 AND month_year LIKE $2`,
            [userId, `${year}-%`]
        );

        // Get yearly EMIs paid
        const emisResult = await pool.query(
            `SELECT SUM(emi_amount) as total FROM loan_payments 
             WHERE user_id = $1 AND TO_CHAR(payment_date, 'YYYY') = $2`,
            [userId, year]
        );

        // Get yearly investments
        const investmentsResult = await pool.query(
            `SELECT SUM(amount) as total FROM investments 
             WHERE user_id = $1 AND TO_CHAR(invested_on, 'YYYY') = $2`,
            [userId, year]
        );

        // Get active loans count
        const loansResult = await pool.query(
            `SELECT COUNT(*) as count FROM loans 
             WHERE user_id = $1 AND status = 'active'`,
            [userId]
        );

        const summary = {
            year: year,
            total_income: parseFloat(incomeResult.rows[0].total || 0),
            total_expenses: parseFloat(expensesResult.rows[0].total || 0),
            total_emis: parseFloat(emisResult.rows[0].total || 0),
            total_investments: parseFloat(investmentsResult.rows[0].total || 0),
            active_loans: parseInt(loansResult.rows[0].count || 0),
            net_savings: parseFloat(incomeResult.rows[0].total || 0) - 
                        parseFloat(expensesResult.rows[0].total || 0) - 
                        parseFloat(emisResult.rows[0].total || 0)
        };

        res.json({ summary });
    } catch (err) {
        console.error("Get year summary error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};
