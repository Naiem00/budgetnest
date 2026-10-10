-- SAFE READ-ONLY schema and row-count audit for BudgetNest.
-- Run in the intended STAGING database first. Contains no user identifiers or secrets.

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('users','transactions','budgets')
ORDER BY table_name, ordinal_position;

SELECT c.relname AS table_name, pg_get_constraintdef(co.oid) AS constraint_definition
FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid
JOIN pg_namespace ns ON ns.oid=c.relnamespace
WHERE ns.nspname='public' AND c.relname IN ('users','transactions','budgets')
ORDER BY c.relname,co.conname;

SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL SELECT 'budgets', COUNT(*) FROM budgets;
