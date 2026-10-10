-- Review and apply once to an existing BudgetNest database BEFORE running category-budget APIs.
-- Additive, preserves every budget and transaction. Legacy monthly budgets become Other.
BEGIN;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS category VARCHAR(100);
UPDATE budgets SET category = 'Other' WHERE category IS NULL OR TRIM(category) = '';
ALTER TABLE budgets ALTER COLUMN category SET NOT NULL;
-- The old one-budget-per-month constraint conflicts with category budgets.
DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'budgets'::regclass AND contype = 'u'
      AND pg_get_constraintdef(oid) ~ '^UNIQUE \(user_id, month\)$'
  LOOP
    EXECUTE format('ALTER TABLE budgets DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS budgets_user_month_category_idx
  ON budgets(user_id, month, category);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
COMMIT;
