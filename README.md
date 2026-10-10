# BudgetNest — Personal Finance

Existing React/Vite + Express + PostgreSQL finance tracker. This code is based on the user's **October 10 local project snapshot**, not a direct checkout of the older GitHub `feature/full-budgetnest` branch. Preserve your backups when adopting it.

**Start with `START_HERE.md` for the safe rollout and staging checklist.**

## Features
- Registration, login, account/password reset, profile preferences and password change
- Income/expense transaction creation, editing, deletion, search, category/type/date filters, and date/amount sorting
- Category monthly budgets with historical month selection, spent/remaining, 80% warnings and overspending alerts
- Dashboard with monthly income, expenses, savings, recorded all-time net balance, recent transactions, budget progress and category breakdown
- Monthly/yearly reporting and custom date ranges from saved transactions
- JPY/BDT preferences, with **recorded currency retained per transaction/budget**; no FX conversion
- Responsive navigation for mobile and desktop

## Requirements
Node.js 22+, PostgreSQL (Supabase supported). `npm ci` in `backend/` and `frontend/`. Example environment variables are in `backend/.env.example` and `frontend/.env.example`; keep real `.env` files private.

Environment variables (never commit real `.env`):

**Backend**: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` (public HTTPS origin for password links), optional `FRONTEND_ORIGINS` (comma-separated allowed origins), `PORT`, `NODE_ENV`, configured email provider variables used by `backend/src/services/email.js` (`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `RESEND_API_KEY`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`).

**Frontend**: `VITE_API_URL` set to the public backend's `/api` base, e.g. `https://your-api.example/api` in production; in development Vite proxies `/api` to `localhost:3000`.

### Local development
```bash
cd backend && npm ci && npm run dev
# separate terminal
cd frontend && npm ci && npm run dev
```

### Database migration (mandatory before launching updated backend)
**Take a Supabase/database backup first.** Run the read-only inspection at `docs/DB_READONLY_AUDIT.sql` against staging, then inspect current schema and apply these in order if not already applied:
1. `backend/src/db/migrations/001_initial_schema.sql` (new installs)
2. `002_password_reset.sql`
3. `003_category_budgets.sql` — adds category to historic budgets (`Other` default) and replaces obsolete one-budget-per-month uniqueness
4. `004_preserve_currency.sql` — adds per-record currency and per-currency indexes; **intentionally stops** if existing transactions or budgets have an unknown historical currency. For a populated DB, add `currency_code` columns and assign the verified original currency to existing rows under a reviewed, separately backed-up migration first. Never infer original currency from the current preference or silently convert amounts.
5. `005_auth_token_version.sql` — adds token revocation counter for password updates/resets. Apply before deploying the updated auth middleware.

Apply only after reviewing migration effects against your real database. No migration is run automatically and no actual production data was modified in preparing this package. Existing `transaction` and `budget` rows remain intact.

### Authentication and currency
Back-end operations use JWT auth and SQL `user_id` scoping. Passwords use bcrypt and password-reset tokens are stored hashed. Sensitive routes use an in-process limiter; production deployments with multiple instances should switch to a shared rate limit store. The frontend stores login JWT in localStorage; cookie-based sessions are a future security improvement.

A changed currency preference does **not** convert historical transactions. Historical transaction rows display their original currency; dashboard/reports/budgets aggregate only the currently selected currency. Do not treat displayed net balance as a bank reconciliation.

### Testing
```bash
cd backend && npm test
cd frontend && npm test
cd frontend && npm run build
cd frontend && npm run lint
# with the local app running and Playwright browser binaries installed:
cd frontend && npx playwright test
```

`node --test frontend/src/utils/report.test.js` checks report maths without a browser. Browser/mobile, production database, cross-user authorization, reset email delivery and deployed hosting require integration testing with test accounts. See `docs/DEPLOYMENT_CHECKLIST.md`.

### Optional AWS portfolio roadmap (not provisioned)
1. CI: GitHub Actions with `npm ci`, unit tests, ESLint/oxlint and Vite build.
2. Containerize Express and deploy to AWS ECS/Fargate when approved; keep keys in Secrets Manager.
3. React static deployment to S3 + CloudFront; configure public API URL and CORS.
4. Database: migrate to managed RDS if required, with backups, private networking and monitoring.
5. Add deployment previews and staging, security monitoring, rollback procedure, cost budgets and alerts *before* enabling paid AWS resources.

## Screenshots checklist
Capture dashboard (populated and empty), transactions and filters, category budgets/warnings, monthly and yearly reports, settings/currency, reset flow (without tokens), and iPhone/Android navigation after real-browser verification.

## Repository notes
`Naiem00/budgetnest`, target branch `feature/full-budgetnest`. The source snapshot used here differs from the remote branch. **Do not copy these files over an unreviewed branch or force-push.** Apply as a reviewed PR after reconciling the branch histories.

### Release hardening
Migration `005_auth_token_version.sql` adds an additive revocation counter. Apply it after 004, before deploying the new API server. Old tokens remain accepted until an account changes its password; any previous sessions are then revoked. Dashboard summary accepts an optional `YYYY-MM` parameter to avoid server timezone boundary mistakes.
