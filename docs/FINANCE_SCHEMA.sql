-- =====================================================
-- FINANCE MANAGEMENT SYSTEM - DATABASE SCHEMA
-- =====================================================
-- This file contains all tables for the new finance management system
-- Run this after the existing tables are created

-- =====================================================
-- 1. LOANS TABLE - Manage loans with EMI tracking
-- =====================================================
CREATE TABLE dev.loans (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    loan_name VARCHAR(100) NOT NULL,
    principal_amount NUMERIC(15, 2) NOT NULL CHECK (principal_amount > 0),
    interest_rate NUMERIC(5, 2) NOT NULL CHECK (interest_rate >= 0),
    tenure_months INT NOT NULL CHECK (tenure_months > 0),
    emi_amount NUMERIC(15, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'foreclosed')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT loans_user_id_fkey FOREIGN KEY (user_id) REFERENCES dev.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_loans_user_id ON dev.loans(user_id);
CREATE INDEX idx_loans_status ON dev.loans(status);

-- =====================================================
-- 2. LOAN PAYMENTS TABLE - Track individual EMI payments
-- =====================================================
CREATE TABLE dev.loan_payments (
    id SERIAL PRIMARY KEY,
    loan_id INT NOT NULL,
    user_id INT NOT NULL,
    payment_number INT NOT NULL,
    payment_date DATE NOT NULL,
    emi_amount NUMERIC(15, 2) NOT NULL,
    principal_paid NUMERIC(15, 2) NOT NULL,
    interest_paid NUMERIC(15, 2) NOT NULL,
    outstanding_balance NUMERIC(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    paid_on TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT loan_payments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES dev.loans(id) ON DELETE CASCADE,
    CONSTRAINT loan_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES dev.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_loan_payments_loan_id ON dev.loan_payments(loan_id);
CREATE INDEX idx_loan_payments_user_id ON dev.loan_payments(user_id);
CREATE INDEX idx_loan_payments_status ON dev.loan_payments(status);
CREATE INDEX idx_loan_payments_date ON dev.loan_payments(payment_date);

-- =====================================================
-- 3. DEBTS TABLE - Track debts to be paid later
-- =====================================================
CREATE TABLE dev.debts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    debt_name VARCHAR(100) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount > 0),
    amount_paid NUMERIC(15, 2) DEFAULT 0 CHECK (amount_paid >= 0),
    creditor VARCHAR(100),
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT debts_user_id_fkey FOREIGN KEY (user_id) REFERENCES dev.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_debts_user_id ON dev.debts(user_id);
CREATE INDEX idx_debts_status ON dev.debts(status);
CREATE INDEX idx_debts_due_date ON dev.debts(due_date);

-- =====================================================
-- 4. RECURRING EXPENSES TABLE - Templates for monthly expenses
-- =====================================================
CREATE TABLE dev.recurring_expenses (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    payment_method VARCHAR(30) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'upi', 'other')),
    is_active BOOLEAN DEFAULT true,
    start_month DATE NOT NULL, -- YYYY-MM-01 format
    end_month DATE, -- YYYY-MM-01 format, null means indefinite
    due_day INT CHECK (due_day >= 1 AND due_day <= 31), -- Day of month when due
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT recurring_expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES dev.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_recurring_expenses_user_id ON dev.recurring_expenses(user_id);
CREATE INDEX idx_recurring_expenses_active ON dev.recurring_expenses(is_active);

-- =====================================================
-- 5. MONTHLY EXPENSES TABLE - Actual monthly expenses
-- =====================================================
CREATE TABLE dev.monthly_expenses (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    recurring_expense_id INT, -- NULL if it's a one-off expense
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    payment_method VARCHAR(30) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'upi', 'other')),
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_on TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT monthly_expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES dev.users(id) ON DELETE CASCADE,
    CONSTRAINT monthly_expenses_recurring_id_fkey FOREIGN KEY (recurring_expense_id) REFERENCES dev.recurring_expenses(id) ON DELETE SET NULL
);

CREATE INDEX idx_monthly_expenses_user_id ON dev.monthly_expenses(user_id);
CREATE INDEX idx_monthly_expenses_month_year ON dev.monthly_expenses(month_year);
CREATE INDEX idx_monthly_expenses_status ON dev.monthly_expenses(status);
CREATE INDEX idx_monthly_expenses_due_date ON dev.monthly_expenses(due_date);

-- =====================================================
-- 6. INCOME TABLE - Track income sources
-- =====================================================
CREATE TABLE dev.income (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    source VARCHAR(100) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    received_on DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT income_user_id_fkey FOREIGN KEY (user_id) REFERENCES dev.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_income_user_id ON dev.income(user_id);
CREATE INDEX idx_income_month_year ON dev.income(month_year);
CREATE INDEX idx_income_received_on ON dev.income(received_on);

-- =====================================================
-- 7. INVESTMENTS TABLE - Track investments and savings
-- =====================================================
CREATE TABLE dev.investments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    investment_type VARCHAR(50) NOT NULL CHECK (investment_type IN ('mutual_fund', 'stocks', 'savings', 'fd', 'ppf', 'gold', 'real_estate', 'crypto', 'other')),
    name VARCHAR(100) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    invested_on DATE NOT NULL,
    maturity_date DATE,
    current_value NUMERIC(15, 2), -- For tracking returns
    returns NUMERIC(15, 2), -- Profit/Loss
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'matured', 'sold')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT investments_user_id_fkey FOREIGN KEY (user_id) REFERENCES dev.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_investments_user_id ON dev.investments(user_id);
CREATE INDEX idx_investments_status ON dev.investments(status);
CREATE INDEX idx_investments_type ON dev.investments(investment_type);

-- =====================================================
-- HELPER FUNCTION - Calculate EMI
-- =====================================================
-- Formula: EMI = [P x R x (1+R)^N]/[(1+R)^N-1]
-- Where P = Principal, R = Monthly Interest Rate, N = Tenure in months
CREATE OR REPLACE FUNCTION calculate_emi(
    principal NUMERIC,
    annual_rate NUMERIC,
    tenure_months INT
) RETURNS NUMERIC AS $$
DECLARE
    monthly_rate NUMERIC;
    emi NUMERIC;
BEGIN
    IF annual_rate = 0 THEN
        RETURN principal / tenure_months;
    END IF;
    
    monthly_rate := annual_rate / (12 * 100);
    emi := (principal * monthly_rate * POWER(1 + monthly_rate, tenure_months)) / 
           (POWER(1 + monthly_rate, tenure_months) - 1);
    
    RETURN ROUND(emi, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER - Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON dev.loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON dev.debts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_expenses_updated_at BEFORE UPDATE ON dev.recurring_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_expenses_updated_at BEFORE UPDATE ON dev.monthly_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_income_updated_at BEFORE UPDATE ON dev.income
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON dev.investments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
