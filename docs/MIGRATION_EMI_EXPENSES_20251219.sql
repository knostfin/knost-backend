-- =====================================================
-- EMI-EXPENSE INTEGRATION MIGRATION
-- Date: December 19, 2025
-- Description: Link EMI payments to monthly expenses table
-- =====================================================

-- Step 1: Add columns to monthly_expenses table
ALTER TABLE dev.monthly_expenses 
ADD COLUMN loan_id INT DEFAULT NULL,
ADD COLUMN loan_payment_id INT DEFAULT NULL,
ADD COLUMN is_emi BOOLEAN DEFAULT false;

-- Step 2: Add foreign key constraints
-- ⚠️ IMPORTANT: Use SET NULL instead of CASCADE to preserve paid EMI expense history
ALTER TABLE dev.monthly_expenses 
ADD CONSTRAINT monthly_expenses_loan_id_fkey 
FOREIGN KEY (loan_id) REFERENCES dev.loans(id) ON DELETE SET NULL;

ALTER TABLE dev.monthly_expenses 
ADD CONSTRAINT monthly_expenses_loan_payment_id_fkey 
FOREIGN KEY (loan_payment_id) REFERENCES dev.loan_payments(id) ON DELETE SET NULL
FOREIGN KEY (loan_payment_id) REFERENCES dev.loan_payments(id) ON DELETE SET NULL;

-- Step 3: Add indexes for performance
CREATE INDEX idx_monthly_expenses_loan_id ON dev.monthly_expenses(loan_id);
CREATE INDEX idx_monthly_expenses_is_emi ON dev.monthly_expenses(is_emi);
CREATE INDEX idx_monthly_expenses_loan_payment_id ON dev.monthly_expenses(loan_payment_id);

-- Step 4: Verify migration
-- Run this query to verify the schema changes:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'monthly_expenses' AND table_schema = 'dev'
-- ORDER BY ordinal_position;
