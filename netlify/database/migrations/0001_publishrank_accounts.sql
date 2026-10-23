CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS publishrank_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  netlify_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS publishrank_wordpress_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES publishrank_profiles(id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  site_host TEXT NOT NULL,
  connection_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS publishrank_connection_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES publishrank_profiles(id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS publishrank_connection_codes_expiry_idx
  ON publishrank_connection_codes (expires_at);
CREATE INDEX IF NOT EXISTS publishrank_connections_profile_idx
  ON publishrank_wordpress_connections (profile_id);
