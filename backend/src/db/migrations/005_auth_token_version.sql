-- Additive: revocation counter for sessions after password changes/resets.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_token_version INTEGER NOT NULL DEFAULT 0;
COMMIT;
