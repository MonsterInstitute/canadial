-- API key management for the public lookup API.
-- This table holds secret keys, so it is NOT readable by anon/authenticated.
-- The application accesses it only via the service-role client (bypasses RLS).

create table if not exists api_keys (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  name text,
  email text,
  tier text default 'free',
  monthly_limit integer default 100,
  usage_count integer default 0,
  usage_reset_at timestamp default (now() + interval '30 days'),
  created_at timestamp default now(),
  is_active boolean default true
);

create index if not exists api_keys_key_idx on api_keys(key);

-- Lock the table down: RLS on, no policies → anon/authenticated get nothing.
-- Only the service-role key (server-side) can read/write keys.
alter table api_keys enable row level security;
