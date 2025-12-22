-- =====================================================
-- FIX: EMI-EXPENSE CASCADE DELETE ISSUE
-- Date: December 19, 2025
-- Description: Fix foreign key constraints to preserve paid EMI expenses when loan is deleted
-- =====================================================

-- Problem: ON DELETE CASCADE deletes ALL monthly_expenses (including paid ones) when loan is deleted
-- Solution: Change to ON DELETE SET NULL to preserve paid expenses as historical records

-- Step 1: Drop existing foreign key constraints
ALTER TABLE dev.monthly_expenses 
DROP CONSTRAINT IF EXISTS monthly_expenses_loan_id_fkey;

ALTER TABLE dev.monthly_expenses 
DROP CONSTRAINT IF EXISTS monthly_expenses_loan_payment_id_fkey;

-- Step 2: Re-add constraints with SET NULL instead of CASCADE
ALTER TABLE dev.monthly_expenses 
ADD CONSTRAINT monthly_expenses_loan_id_fkey 
FOREIGN KEY (loan_id) REFERENCES dev.loans(id) ON DELETE SET NULL;

ALTER TABLE dev.monthly_expenses 
ADD CONSTRAINT monthly_expenses_loan_payment_id_fkey 
FOREIGN KEY (loan_payment_id) REFERENCES dev.loan_payments(id) ON DELETE SET NULL;

-- Step 3: Verify the fix
-- SELECT 
--   tc.constraint_name, 
--   tc.table_name, 
--   rc.delete_rule
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.referential_constraints AS rc 
--   ON tc.constraint_name = rc.constraint_name
-- WHERE tc.table_name = 'monthly_expenses' 
--   AND tc.table_schema = 'dev'
--   AND tc.constraint_type = 'FOREIGN KEY';
-- Expected: delete_rule = 'SET NULL'
