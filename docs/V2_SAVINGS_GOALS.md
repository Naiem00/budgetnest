# BudgetNest v2.0 — Sprint 1: Savings Goals

## Added
- Secure user-scoped CRUD at `/api/goals` (requires existing BudgetNest JWT).
- Create/edit/delete goals with name, target, optional deadline and immutable currency.
- Manually add and withdraw saved progress; atomic SQL update prevents negative balances.
- Dedicated responsive `Goals` page (`/goals`) and navigation.
- New additive `006_savings_goals.sql` migration; creates a table with RLS enabled and **no Supabase public-client policies**.
- Backend pure validation tests, frontend Playwright authentication/nav tests.

## Important financial behavior
Saved goal progress is a **manual tracker**, not a bank balance. Adding or withdrawing from a goal does **not** create a transaction, transfer funds, or affect dashboard totals. Each goal retains its currency, even if your profile preference changes.

## Recommended local workflow
1. In your Mac Git repo, fetch `main`, create a *new* branch `feature/budgetnest-v2-goals`. Do not edit or deploy `main`.
2. Apply this patch to that branch.
3. Run `npm test` in `backend/`, then `npm test`, `npm run lint`, `npm run build` in `frontend/`.
4. Restore a **copy** of the database to local staging; apply `backend/src/db/migrations/006_savings_goals.sql` **only** to staging first.
5. Use local backend + frontend to test `/goals` with two disposable accounts, particularly that one user cannot edit another's goal IDs.
6. Do **not** run migration 006 on production or deploy this v2 branch until staging tests pass.

## Remaining v2 roadmap
Recurring transactions, monthly comparison, CSV export, and mobile UX improvements.
