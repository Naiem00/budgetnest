# BudgetNest v2 Sprint 2 — Manual Recurring Transactions

- Templates for monthly income/expenses (day 1–31, start month, category, amount, note).
- The user must click **Review & Record** and confirm before any transaction is saved.
- No background scheduler, email reminders, direct bank connections, or automatic charges.
- Due dates clamp to the last calendar day of short months; future posting is rejected by API.
- A row-locked transaction plus the unique `(template_id,month)` posting ledger ensures at most one post per template per month.
- Pausing templates does not delete historical postings; posted transactions remain regular editable financial records.
- If a posted transaction is later deleted, that month stays marked as posted to prevent unintentional duplicates.
- Each template remembers the currency at creation time. Editing profile currency does not convert existing templates or transactions.
- All API queries scope to the authenticated user's ID; Supabase public API remains blocked by RLS.
- Migration `007_recurring_transactions.sql` only creates new tables; test against disposable local staging before any production operation.

## Local release checklist
1. Install patch only on `feature/budgetnest-v2-goals` or new `feature/budgetnest-v2-recurring` branch.
2. npm test in backend, frontend tests, lint, build, Playwright tests.
3. Apply migrations 001–007 to **new disposable local database** and API test with two test users.
4. Never apply migration to Supabase production or merge into live main without an explicit later request.
