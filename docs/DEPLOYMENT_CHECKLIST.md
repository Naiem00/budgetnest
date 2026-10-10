# BudgetNest release verification checklist

**No production database, deployment, secrets, or user account was accessed during this offline implementation.**

## Before deployment
- [ ] Diff changed files against the current remote branch and merge manually (local snapshot is newer).
- [ ] Back up PostgreSQL; inspect current `budgets` constraints and currency columns.
- [ ] Review then apply migrations 003, 004 and 005; **004 aborts on unlabeled historic JPY/BDT entries—prepare an explicitly reviewed backfill before applying it**; validate row counts and totals before/after.
- [ ] Install dependencies with `npm ci`; run backend tests and frontend production build.
- [ ] Set `DATABASE_URL`, sufficiently random `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL` (HTTPS), `FRONTEND_ORIGINS`, Vite `VITE_API_URL`; never commit them.
- [ ] Confirm TLS, health checks, error monitoring, and that secrets never appear in logs.

## Test accounts and real integration
- [ ] Register account A; login; log out; login again.
- [ ] Add income and expenses in JPY; edit/delete; check transaction date and amount validation.
- [ ] Search/filter/sort; verify on iPhone Safari, Android Chrome, tablet and desktop.
- [ ] Create two budgets for the same month (different categories); edit/delete and inspect spent/remaining.
- [ ] Switch to prior month and back; verify historic budgets remain unchanged.
- [ ] Confirm dashboard and report totals against SQL sums for the test account.
- [ ] Switch to BDT, add a BDT transaction; verify JPY rows retain JPY denomination, never sum JPY+BDT.
- [ ] Login with user B and attempt to read/edit/delete user A's IDs; expect 404 or scoped emptiness.
- [ ] Request/reset password through the actual deployed email link, confirm expiration and token single-use.
- [ ] Test profile update, password change and re-authentication.
- [ ] Test with backend/database unavailable, verify useful error states.
- [ ] Confirm there is no OCR UI, route, endpoint, or unused OCR dependency.
- [ ] Verify responsive navigation has all destinations and no horizontal overflow.
- [ ] Check lockfiles, security audit (`npm audit`), accessibility and console errors.

## Deployment architecture
Browser (React) -> HTTPS API (Express) -> PostgreSQL/Supabase; reset emails via configured provider. Never expose `DATABASE_URL` or provider secrets in Vite environment variables.

## Outstanding risk
- Current rate limiter is per Node process; shared store required for distributed deployment.
- Currency historical backfill depends on prior per-user preference. If old data mixed JPY and BDT *before* 004, manual reconciliation is necessary.
- No full browser, Supabase, live email, or cloud deploy was run in the preparation environment.
- User-visible reports use persisted data fetched by user-scoped API, not fabricated chart values.

## Auth/session release checks
- [ ] Apply migration 005 before deploying the new middleware; old unversioned JWTs remain valid until a password change.
- [ ] Verify password change and password reset invalidate old JWTs, including on a second browser.
- [ ] Verify `GET /api/transactions/summary?month=YYYY-MM` uses the requested month (and rejects malformed months).
- [ ] Compare server month/date behavior with Japan and Bangladesh timezones around midnight.
- [ ] Check backups and DB migration outcome before restarting service.
