-- BudgetNest v2.0 - Savings goals; adds new tables only.
-- Apply on a disposable restored/staging database before production.
BEGIN;
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL CHECK (LENGTH(BTRIM(title)) BETWEEN 1 AND 100),
  target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0 AND target_amount <= 99999999.99),
  saved_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
  currency_code VARCHAR(3) NOT NULL CHECK (currency_code IN ('JPY','BDT')),
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS savings_goals_user_created_idx
  ON public.savings_goals (user_id, created_at DESC);
-- No policies: regular Supabase anon/authenticated API clients cannot access these rows.
-- Express uses its database connection and JWT user_id scoping.
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
COMMIT;
