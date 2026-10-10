-- BudgetNest v2 Sprint 2: manual monthly recurring templates.
-- Additive migration, no existing transaction rows altered.
BEGIN;
CREATE TABLE IF NOT EXISTS public.recurring_templates (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL CHECK (LENGTH(BTRIM(title)) BETWEEN 1 AND 100),
  type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0 AND amount <= 99999999.99),
  currency_code VARCHAR(3) NOT NULL CHECK (currency_code IN ('JPY','BDT')),
  category VARCHAR(100) NOT NULL CHECK (LENGTH(BTRIM(category)) BETWEEN 1 AND 100),
  merchant VARCHAR(150),
  payment_method VARCHAR(50),
  note VARCHAR(5000),
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  start_month DATE NOT NULL CHECK (EXTRACT(DAY FROM start_month)=1),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS recurring_templates_user_idx ON public.recurring_templates(user_id, created_at DESC);
-- Posting ledger prevents duplicates even if the generated transaction is later deleted.
-- Templates are paused, not deleted, to preserve their posting ledger.
CREATE TABLE IF NOT EXISTS public.recurring_postings (
  template_id BIGINT NOT NULL REFERENCES public.recurring_templates(id) ON DELETE RESTRICT,
  month DATE NOT NULL CHECK (EXTRACT(DAY FROM month)=1),
  transaction_id BIGINT REFERENCES public.transactions(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(template_id, month)
);
CREATE INDEX IF NOT EXISTS recurring_postings_transaction_idx ON public.recurring_postings(transaction_id);
ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_postings ENABLE ROW LEVEL SECURITY;
-- Express connects directly as database role and performs JWT-scoped SQL.
-- There are deliberately no Supabase anon/authenticated RLS policies.
COMMIT;
