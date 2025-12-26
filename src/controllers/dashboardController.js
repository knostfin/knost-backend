const pool = require("../db");

// ---------------------- EXCEL UTIL HELPERS -------------------------
// Reusable helpers to keep Excel generation clean and maintainable
const styleHeaderRow = (sheet, colorArgb) => {
    const row = sheet.getRow(1);
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.alignment = { vertical: "middle", horizontal: "center" };
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: colorArgb }
        };
    });
};

const addTotalRow = (sheet, totalColLetter, total, colorArgb, label = "TOTAL") => {
    const lastRow = sheet.rowCount + 1;
    sheet.getCell(`A${lastRow}`).value = label;
    sheet.getCell(`A${lastRow}`).font = { bold: true };
    sheet.getCell(`${totalColLetter}${lastRow}`).value = Number(total || 0);
    sheet.getCell(`${totalColLetter}${lastRow}`).numFmt = "₹#,##0.00";
    sheet.getCell(`${totalColLetter}${lastRow}`).font = { bold: true, color: { argb: colorArgb } };
    sheet.getCell(`${totalColLetter}${lastRow}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: total >= 0 ? "FFD1FAE5" : "FFFECACA" }
    };
};

const setupTableEnhancements = (sheet, headerRange) => {
    // Freeze header row and enable auto-filter; set print-friendly layout
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = headerRange; // e.g., "A1:D1"
    sheet.pageSetup = { fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
};

const setDateColumnFormat = (sheet, colKey) => {
    const col = sheet.getColumn(colKey);
    if (col) {
        col.numFmt = "dd-mmm-yyyy";
        col.alignment = { horizontal: "center" };
    }
};

const setCurrencyColumnFormat = (sheet, colKey) => {
    const col = sheet.getColumn(colKey);
    if (col) {
        col.numFmt = "₹#,##0.00";
        col.alignment = { horizontal: "right" };
    }
};

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
            `select
                COUNT(distinct d.id) as total_count,
                SUM(me.amount) as total_amount
            from
                dev.debts d
            inner join dev.monthly_expenses me
                on me.user_id = d.user_id
                and me.debt_id = d.id
                and me.category LIKE '%Debt%'
            where
                d.user_id = $1
                and TO_CHAR(me.paid_on, 'YYYY-MM') = $2
                and d.status != 'pending'`,
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
        const totalPending = expensesPending + emisPending;
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

// ---------------------- GET EXPENSE CATEGORY BREAKDOWN FOR MONTH -------------------------
exports.getExpenseCategoryBreakdown = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month_year } = req.params;

        if (!month_year || !/^\d{4}-\d{2}$/.test(month_year)) {
            return res.status(400).json({ error: "Invalid month_year format. Use YYYY-MM" });
        }

        // Get category breakdown
        const result = await pool.query(
            `SELECT 
                category,
                SUM(amount) as amount,
                COUNT(*) as transaction_count,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
             FROM monthly_expenses 
             WHERE user_id = $1 AND month_year = $2
             GROUP BY category
             ORDER BY amount DESC`,
            [userId, month_year]
        );

        // Get total expenses for percentage calculation
        const totalResult = await pool.query(
            `SELECT SUM(amount) as total FROM monthly_expenses 
             WHERE user_id = $1 AND month_year = $2`,
            [userId, month_year]
        );

        const totalAmount = parseFloat(totalResult.rows[0].total || 0);

        const breakdown = result.rows.map(row => ({
            category: row.category,
            amount: parseFloat(row.amount) || 0,
            percentage: totalAmount > 0 ? ((parseFloat(row.amount) / totalAmount) * 100).toFixed(2) : 0,
            transaction_count: parseInt(row.transaction_count) || 0,
            paid_count: parseInt(row.paid_count) || 0,
            pending_count: parseInt(row.pending_count) || 0
        }));

        res.json({
            month_year: month_year,
            total_amount: totalAmount,
            breakdown: breakdown
        });
    } catch (err) {
        console.error("Get expense category breakdown error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET HISTORICAL TRENDS -------------------------
exports.getHistoricalTrends = async (req, res) => {
    try {
        const userId = req.user.id;
        const { months = 6 } = req.query;

        if (isNaN(months) || months < 1 || months > 24) {
            return res.status(400).json({ error: "Months must be between 1 and 24" });
        }

        // Generate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - (parseInt(months) - 1));

        // Get income trend
        const incomeResult = await pool.query(
            `SELECT 
                month_year,
                SUM(amount) as total
             FROM income 
             WHERE user_id = $1 
             AND TO_DATE(month_year || '-01', 'YYYY-MM-DD') >= $2
             GROUP BY month_year
             ORDER BY month_year ASC`,
            [userId, startDate.toISOString().split('T')[0]]
        );

        // Get expenses trend
        const expensesResult = await pool.query(
            `SELECT 
                month_year,
                SUM(amount) as total
             FROM monthly_expenses 
             WHERE user_id = $1 
             AND TO_DATE(month_year || '-01', 'YYYY-MM-DD') >= $2
             GROUP BY month_year
             ORDER BY month_year ASC`,
            [userId, startDate.toISOString().split('T')[0]]
        );

        // Get EMIs trend
        const emisResult = await pool.query(
            `SELECT 
                TO_CHAR(payment_date, 'YYYY-MM') as month_year,
                SUM(emi_amount) as total
             FROM loan_payments 
             WHERE user_id = $1 
             AND payment_date >= $2
             GROUP BY month_year
             ORDER BY month_year ASC`,
            [userId, startDate.toISOString().split('T')[0]]
        );

        // Build complete month range
        const monthsData = {};
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

        // Fill data
        incomeResult.rows.forEach(row => {
            if (monthsData[row.month_year]) {
                monthsData[row.month_year].income = parseFloat(row.total) || 0;
            }
        });

        expensesResult.rows.forEach(row => {
            if (monthsData[row.month_year]) {
                monthsData[row.month_year].expenses = parseFloat(row.total) || 0;
            }
        });

        emisResult.rows.forEach(row => {
            if (monthsData[row.month_year]) {
                monthsData[row.month_year].emis = parseFloat(row.total) || 0;
            }
        });

        // Calculate balance and savings rate
        Object.keys(monthsData).forEach(month => {
            const data = monthsData[month];
            data.balance = data.income - data.expenses - data.emis;
            data.savings_rate = data.income > 0 ? ((data.balance / data.income) * 100).toFixed(2) : 0;
        });

        const monthsArray = Object.values(monthsData);

        res.json({
            period_months: parseInt(months),
            start_month: monthsArray[0]?.month_year || startDate.toISOString().slice(0, 7),
            end_month: monthsArray[monthsArray.length - 1]?.month_year || endDate.toISOString().slice(0, 7),
            trends: monthsArray
        });
    } catch (err) {
        console.error("Get historical trends error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET SUMMARY STATISTICS -------------------------
exports.getSummaryStatistics = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month_year } = req.params;

        if (!month_year || !/^\d{4}-\d{2}$/.test(month_year)) {
            return res.status(400).json({ error: "Invalid month_year format. Use YYYY-MM" });
        }

        // Get income data
        const incomeData = await pool.query(
            `SELECT 
                SUM(amount) as total,
                COUNT(*) as count,
                AVG(amount) as average
             FROM income 
             WHERE user_id = $1 AND month_year = $2`,
            [userId, month_year]
        );

        // Get expenses data
        const expensesData = await pool.query(
            `SELECT 
                SUM(amount) as total,
                COUNT(*) as count,
                AVG(amount) as average,
                SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_total
             FROM monthly_expenses 
             WHERE user_id = $1 AND month_year = $2`,
            [userId, month_year]
        );

        // Get EMIs data
        const emisData = await pool.query(
            `SELECT 
                SUM(emi_amount) as total,
                COUNT(*) as count,
                AVG(emi_amount) as average,
                SUM(CASE WHEN status = 'paid' THEN emi_amount ELSE 0 END) as paid_total
             FROM loan_payments 
             WHERE user_id = $1 AND TO_CHAR(payment_date, 'YYYY-MM') = $2`,
            [userId, month_year]
        );

        // Get debts data
        const debtsData = await pool.query(
            `SELECT 
                SUM(total_amount - COALESCE(amount_paid, 0)) as total,
                COUNT(*) as count
             FROM debts 
             WHERE user_id = $1 
             AND TO_CHAR(due_date, 'YYYY-MM') = $2
             AND status != 'paid'`,
            [userId, month_year]
        );

        // Get investments data
        const investmentsData = await pool.query(
            `SELECT 
                SUM(amount) as total,
                COUNT(*) as count
             FROM investments 
             WHERE user_id = $1 AND TO_CHAR(invested_on, 'YYYY-MM') = $2`,
            [userId, month_year]
        );

        const totalIncome = parseFloat(incomeData.rows[0].total || 0);
        const totalExpenses = parseFloat(expensesData.rows[0].total || 0);
        const totalEmis = parseFloat(emisData.rows[0].total || 0);
        const totalDebts = parseFloat(debtsData.rows[0].total || 0);
        const totalInvestments = parseFloat(investmentsData.rows[0].total || 0);

        const balance = totalIncome - totalExpenses - totalEmis;
        const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(2) : 0;

        const statistics = {
            month_year: month_year,
            income: {
                total: totalIncome,
                count: parseInt(incomeData.rows[0].count) || 0,
                average: parseFloat(incomeData.rows[0].average) || 0
            },
            expenses: {
                total: totalExpenses,
                count: parseInt(expensesData.rows[0].count) || 0,
                average: parseFloat(expensesData.rows[0].average) || 0,
                paid_amount: parseFloat(expensesData.rows[0].paid_total) || 0
            },
            emis: {
                total: totalEmis,
                count: parseInt(emisData.rows[0].count) || 0,
                average: parseFloat(emisData.rows[0].average) || 0,
                paid_amount: parseFloat(emisData.rows[0].paid_total) || 0
            },
            debts: {
                total: totalDebts,
                count: parseInt(debtsData.rows[0].count) || 0
            },
            investments: {
                total: totalInvestments,
                count: parseInt(investmentsData.rows[0].count) || 0
            },
            summary: {
                total_income: totalIncome,
                total_expenses: totalExpenses,
                total_emis: totalEmis,
                total_debts: totalDebts,
                total_investments: totalInvestments,
                balance: balance,
                savings_rate_percent: parseFloat(savingsRate)
            }
        };

        res.json({ statistics });
    } catch (err) {
        console.error("Get summary statistics error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET EMI CALCULATION ENDPOINT -------------------------
exports.calculateEMI = async (req, res) => {
    try {
        const { principal_amount, annual_interest_rate, tenure_months } = req.body;

        // Validation
        if (!principal_amount || !annual_interest_rate || !tenure_months) {
            return res.status(400).json({
                error: "principal_amount, annual_interest_rate, and tenure_months are required"
            });
        }

        const P = parseFloat(principal_amount);
        const R = parseFloat(annual_interest_rate);
        const N = parseInt(tenure_months);

        if (P <= 0 || R < 0 || N <= 0) {
            return res.status(400).json({
                error: "principal_amount and tenure_months must be positive, interest_rate must be non-negative"
            });
        }

        // Calculate EMI
        let emiAmount;
        if (R === 0) {
            emiAmount = P / N;
        } else {
            const monthlyRate = R / (12 * 100);
            const numerator = P * monthlyRate * Math.pow(1 + monthlyRate, N);
            const denominator = Math.pow(1 + monthlyRate, N) - 1;
            emiAmount = numerator / denominator;
        }

        // Generate payment schedule
        const schedule = [];
        let outstandingBalance = P;
        const monthlyRate = R / (12 * 100);

        for (let i = 1; i <= N; i++) {
            const interestPaid = outstandingBalance * monthlyRate;
            const principalPaid = emiAmount - interestPaid;
            outstandingBalance -= principalPaid;

            schedule.push({
                payment_number: i,
                emi_amount: parseFloat(emiAmount.toFixed(2)),
                principal_paid: parseFloat(principalPaid.toFixed(2)),
                interest_paid: parseFloat(interestPaid.toFixed(2)),
                outstanding_balance: parseFloat(Math.max(0, outstandingBalance).toFixed(2))
            });
        }

        const totalInterest = schedule.reduce((sum, p) => sum + p.interest_paid, 0);

        res.json({
            calculation: {
                principal_amount: P,
                annual_interest_rate: R,
                tenure_months: N,
                monthly_emi: parseFloat(emiAmount.toFixed(2)),
                total_interest: parseFloat(totalInterest.toFixed(2)),
                total_amount_payable: parseFloat((P + totalInterest).toFixed(2))
            },
            payment_schedule: schedule
        });
    } catch (err) {
        console.error("Calculate EMI error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- GET LOAN PAYMENT SUMMARY -------------------------
exports.getLoanPaymentSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const { loan_id } = req.params;

        // Get loan details
        const loanResult = await pool.query(
            `SELECT * FROM loans WHERE id = $1 AND user_id = $2`,
            [loan_id, userId]
        );

        if (loanResult.rows.length === 0) {
            return res.status(404).json({ error: "Loan not found" });
        }

        const loan = loanResult.rows[0];

        // Get payment schedule summary
        const paymentsResult = await pool.query(
            `SELECT 
                COUNT(*) as total_payments,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_payments,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
                SUM(emi_amount) as total_emi,
                SUM(CASE WHEN status = 'paid' THEN emi_amount ELSE 0 END) as paid_emi,
                SUM(CASE WHEN status = 'pending' THEN emi_amount ELSE 0 END) as pending_emi,
                SUM(principal_paid) as principal_paid_total,
                SUM(interest_paid) as interest_paid_total
             FROM loan_payments 
             WHERE loan_id = $1`,
            [loan_id]
        );

        const payments = paymentsResult.rows[0];

        const summary = {
            loan_id: loan_id,
            loan_name: loan.loan_name,
            principal_amount: parseFloat(loan.principal_amount) || 0,
            annual_interest_rate: parseFloat(loan.interest_rate) || 0,
            tenure_months: parseInt(loan.tenure_months) || 0,
            total_payments: parseInt(payments.total_payments) || 0,
            paid_payments: parseInt(payments.paid_payments) || 0,
            pending_payments: parseInt(payments.pending_payments) || 0,
            payment_progress_percent: payments.total_payments > 0 
                ? ((parseInt(payments.paid_payments) / parseInt(payments.total_payments)) * 100).toFixed(2)
                : 0,
            total_emi: parseFloat(payments.total_emi) || 0,
            paid_emi: parseFloat(payments.paid_emi) || 0,
            pending_emi: parseFloat(payments.pending_emi) || 0,
            principal_paid: parseFloat(payments.principal_paid_total) || 0,
            principal_remaining: parseFloat((loan.principal_amount - (payments.principal_paid_total || 0)).toFixed(2)),
            interest_paid: parseFloat(payments.interest_paid_total) || 0,
            status: loan.status
        };

        res.json({ summary });
    } catch (err) {
        console.error("Get loan payment summary error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// ---------------------- DOWNLOAD MONTHLY REPORT AS EXCEL -------------------------
exports.downloadMonthlyReport = async (req, res) => {
    try {
        const ExcelJS = require("exceljs");
        const userId = req.user.id;
        const { month_year } = req.params;

        if (!month_year || !/^\d{4}-\d{2}$/.test(month_year)) {
            return res.status(400).json({ error: "Invalid month_year format. Use YYYY-MM" });
        }

        // Fetch Income
        const incomeResult = await pool.query(
            `SELECT source, amount, received_on, description
             FROM income WHERE user_id = $1 AND month_year = $2
             ORDER BY received_on DESC`,
            [userId, month_year]
        );

        // Fetch Expenses
        const expensesResult = await pool.query(
            `SELECT description, category, due_date, status, amount, payment_method
             FROM monthly_expenses WHERE user_id = $1 AND month_year = $2
             ORDER BY due_date DESC`,
            [userId, month_year]
        );

        // Optimized single-query overview totals
        const overviewQuery = `
          SELECT 
            (SELECT COALESCE(SUM(amount), 0) FROM income WHERE user_id = $1 AND month_year = $2) as total_income,
            (SELECT COALESCE(SUM(amount), 0) FROM monthly_expenses WHERE user_id = $1 AND month_year = $2) as total_expenses,
            (SELECT COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) FROM monthly_expenses WHERE user_id = $1 AND month_year = $2) as total_paid,
            (SELECT COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) FROM monthly_expenses WHERE user_id = $1 AND month_year = $2) as total_pending
        `;
        const overviewResult = await pool.query(overviewQuery, [userId, month_year]);
        const overviewTotals = overviewResult.rows[0] || {};

        const totalIncome = Number(overviewTotals.total_income || 0);
        const totalExpenses = Number(overviewTotals.total_expenses || 0);
        const totalPaid = Number(overviewTotals.total_paid || 0);
        const totalPending = Number(overviewTotals.total_pending || 0);
        const balancePaidOnly = totalIncome - totalPaid; // current logic

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Knost App";
        workbook.created = new Date();

        // Add Summary Sheet
        const summarySheet = workbook.addWorksheet("Summary", {
            properties: { tabColor: { argb: "FF10B981" } }
        });

        // Summary header
        summarySheet.getCell("A1").value = `Monthly Financial Report - ${month_year}`;
        summarySheet.getCell("A1").font = { size: 16, bold: true, color: { argb: "FF10B981" } };
        summarySheet.mergeCells("A1:B1");

        // Summary data
        summarySheet.getCell("A3").value = "Total Income:";
        summarySheet.getCell("B3").value = totalIncome;
        summarySheet.getCell("B3").numFmt = "₹#,##0.00";
        summarySheet.getCell("B3").font = { color: { argb: "FF10B981" }, bold: true };

        summarySheet.getCell("A4").value = "Total Expenses:";
        summarySheet.getCell("B4").value = totalExpenses;
        summarySheet.getCell("B4").numFmt = "₹#,##0.00";
        summarySheet.getCell("B4").font = { color: { argb: "FFEF4444" }, bold: true };

        summarySheet.getCell("A5").value = "Paid:";
        summarySheet.getCell("B5").value = totalPaid;
        summarySheet.getCell("B5").numFmt = "₹#,##0.00";

        summarySheet.getCell("A6").value = "Pending:";
        summarySheet.getCell("B6").value = totalPending;
        summarySheet.getCell("B6").numFmt = "₹#,##0.00";
        summarySheet.getCell("B6").font = { color: { argb: "FFF59E0B" } };

        summarySheet.getCell("A7").value = "Balance (Paid Only):";
        summarySheet.getCell("B7").value = balancePaidOnly;
        summarySheet.getCell("B7").numFmt = "₹#,##0.00";
        summarySheet.getCell("B7").font = {
            bold: true,
            color: { argb: balancePaidOnly >= 0 ? "FF10B981" : "FFEF4444" }
        };

        summarySheet.columns = [{ width: 24 }, { width: 24 }];

        // Add Income Sheet
        const incomeSheet = workbook.addWorksheet("Income", {
            properties: { tabColor: { argb: "FF10B981" } }
        });
        incomeSheet.columns = [
            { header: "Source", key: "source", width: 30 },
            { header: "Amount", key: "amount", width: 15 },
            { header: "Date", key: "date", width: 15 },
            { header: "Description", key: "description", width: 40 }
        ];
        styleHeaderRow(incomeSheet, "FF10B981");
        setupTableEnhancements(incomeSheet, "A1:D1");
        setCurrencyColumnFormat(incomeSheet, "amount");
        setDateColumnFormat(incomeSheet, "date");

        // Add income data (use real Date + numeric amount)
        incomeResult.rows.forEach((row) => {
            incomeSheet.addRow({
                source: row.source,
                amount: Number(row.amount || 0),
                date: row.received_on ? new Date(row.received_on) : null,
                description: row.description || "-"
            });
        });
        addTotalRow(incomeSheet, "B", totalIncome, "FF10B981");

        // Add Expenses Sheet
        const expensesSheet = workbook.addWorksheet("Expenses", {
            properties: { tabColor: { argb: "FFEF4444" } }
        });
        expensesSheet.columns = [
            { header: "Description", key: "description", width: 35 },
            { header: "Category", key: "category", width: 20 },
            { header: "Date", key: "date", width: 15 },
            { header: "Status", key: "status", width: 12 },
            { header: "Amount", key: "amount", width: 15 },
            { header: "Payment Method", key: "payment_method", width: 18 }
        ];
        styleHeaderRow(expensesSheet, "FFEF4444");
        setupTableEnhancements(expensesSheet, "A1:F1");
        setCurrencyColumnFormat(expensesSheet, "amount");
        setDateColumnFormat(expensesSheet, "date");

        expensesResult.rows.forEach((row) => {
            const newRow = expensesSheet.addRow({
                description: row.description || "-",
                category: row.category,
                date: row.due_date ? new Date(row.due_date) : null,
                status: row.status,
                amount: Number(row.amount || 0),
                payment_method: row.payment_method || "-"
            });

            // Visual cue via font color (conditional formatting not supported natively in exceljs)
            const statusCell = newRow.getCell("status");
            if (row.status === "paid") {
                statusCell.font = { color: { argb: "FF10B981" }, bold: true };
            } else {
                statusCell.font = { color: { argb: "FFF59E0B" }, bold: true };
            }
        });
        addTotalRow(expensesSheet, "E", totalExpenses, "FFEF4444");

        // Set response headers and stream the workbook
        const filename = `Monthly_Report_${month_year}.xlsx`;
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error("Download monthly report error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};
