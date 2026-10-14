CREATE TABLE IF NOT EXISTS accounts (
 id UUID PRIMARY KEY, username TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL, profile JSONB NOT NULL,
 revision BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK ((profile->>'nb')::numeric>=0 AND (profile->>'tb')::numeric>=0)
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, account_id UUID NOT NULL REFERENCES accounts(id),
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS inventory (
 item_id UUID PRIMARY KEY, account_id UUID NOT NULL REFERENCES accounts(id),
 item JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS ledger (
 id BIGSERIAL PRIMARY KEY, account_id UUID NOT NULL REFERENCES accounts(id),
 idempotency_key TEXT NOT NULL, operation TEXT NOT NULL, result JSONB NOT NULL,
 before_profile JSONB NOT NULL, after_profile JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(account_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS results (
 id UUID PRIMARY KEY, account_id UUID NOT NULL REFERENCES accounts(id),
 extracted_value NUMERIC NOT NULL, kills INT NOT NULL, outcome TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE results ADD COLUMN IF NOT EXISTS hero INT NOT NULL DEFAULT 0;
