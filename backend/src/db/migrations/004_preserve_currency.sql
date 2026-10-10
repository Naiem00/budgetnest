-- Keep historical values in their recorded currency; never re-label or convert them.
-- Apply AFTER migration 003. Review a database backup before applying.
BEGIN;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3);
-- Earlier versions did not record a currency per row. It cannot be inferred reliably
-- from today's user preference. NEVER relabel historic amounts silently.
-- For an existing populated database, first review original records and explicitly
-- assign verified denominations for legacy rows in a separate approved migration.
-- If any row is still unknown, abort this migration without changing anything.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM transactions WHERE currency_code IS NULL) OR
     EXISTS (SELECT 1 FROM budgets WHERE currency_code IS NULL) THEN
    RAISE EXCEPTION 'Historical currencies unverified: assign the verified original currency_code to every legacy transaction and budget before running migration 004';
  END IF;
END $$;
ALTER TABLE transactions ALTER COLUMN currency_code SET NOT NULL;
ALTER TABLE budgets ALTER COLUMN currency_code SET NOT NULL;
-- Some existing installations may have a UNIQUE(user_id, month, category) constraint.
DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN SELECT conname FROM pg_constraint
    WHERE conrelid='budgets'::regclass AND contype='u'
      AND pg_get_constraintdef(oid) ~ '^UNIQUE \(user_id, month, category\)$'
  LOOP
    EXECUTE format('ALTER TABLE budgets DROP CONSTRAINT %I',constraint_name);
  END LOOP;
END $$;
DROP INDEX IF EXISTS budgets_user_month_category_idx;
CREATE UNIQUE INDEX IF NOT EXISTS budgets_user_month_category_currency_idx
 ON budgets(user_id,month,category,currency_code);
CREATE INDEX IF NOT EXISTS transactions_user_currency_date_idx
 ON transactions(user_id,currency_code,transaction_date DESC);
COMMIT;
