# BudgetNest — Start Here (release candidate, not production verified)

This is the no-receipt-scanner candidate, based on your newer October 10 uploaded project snapshot. **It is not yet pushed to GitHub** and must not overwrite your working project before integration testing.

## Safest local test (Mac)

1. Keep `~/Desktop/budgetnest` and `~/Desktop/budgetnest1` as backups. Extract this ZIP to a **separate folder**, e.g. `~/Desktop/budgetnest-release-candidate` (the ZIP contains an inner `budgetnest` folder; rename that extracted folder).
2. Copy your existing, private `backend/.env` into the candidate's `backend/` folder; do not send it anywhere or add it to Git. Do not use placeholder values from `.env.example` as real credentials. Verify `DATABASE_URL` points to your intended **staging** database.
3. **Do not start the updated backend on your real database yet**. First run `docs/DB_READONLY_AUDIT.sql` against staging, back up the database and review migrations `003`, `004`, `005` with the production schema. Migration 004 deliberately stops on unlabeled legacy rows: check originals, assign verified JPY/BDT currency labels in a separate reviewed data-migration operation, then retry. No amount conversion occurs.
4. Open candidate project Terminal. Run `(cd backend && npm ci)` and `(cd frontend && npm ci)`; no paid services required for development.
5. Run `(cd backend && npm test)` and `(cd frontend && npm test && npm run build && npm run lint)`.
6. Only after **staging** migrations and a working staged `.env`, close any old servers running on ports 3000/5173 and run `./start-budgetnest.sh` in the candidate root.
7. Open `http://localhost:5173/login`. Use a test account, not financial production data. Check every scenario in `docs/DEPLOYMENT_CHECKLIST.md` before promoting.

## Essential caveats

- No live Supabase migration or actual browser/email/deployment test was performed while preparing this candidate.
- Do not copy the newer candidate's SQL migration code into a running backend before the migration is reviewed and applied.
- If the GitHub connector returns 403, use an authorized GitHub account or work locally on your branch; do not force-push.
- For production, configure `FRONTEND_URL`, `FRONTEND_ORIGINS`, `VITE_API_URL` and HTTPS according to README; do not use localhost links in your deployed frontend.
