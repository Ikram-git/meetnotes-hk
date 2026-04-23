-- Personal API keys that external tools (Zapier, custom scripts, CLI) use to
-- authenticate on behalf of a user. Stored hashed — the plaintext is only
-- visible at creation time.
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null, -- first 14 chars, for display ("briva_sk_abc…")
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_user_idx on public.api_keys (user_id) where revoked_at is null;

alter table public.api_keys enable row level security;

create policy "Users read their own api keys"
  on public.api_keys for select using (user_id = auth.uid());
create policy "Users insert their own api keys"
  on public.api_keys for insert with check (user_id = auth.uid());
create policy "Users revoke their own api keys"
  on public.api_keys for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete their own api keys"
  on public.api_keys for delete using (user_id = auth.uid());


-- Webhook subscriptions — Zapier (and future third parties) POST here to
-- register a callback URL for the "new meeting completed" event.
create table if not exists public.webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_url text not null,
  event_type text not null default 'meeting.completed' check (event_type in ('meeting.completed')),
  source text not null default 'zapier', -- zapier | make | custom
  created_at timestamptz not null default now()
);

create index if not exists webhook_subscriptions_user_event_idx
  on public.webhook_subscriptions (user_id, event_type);

alter table public.webhook_subscriptions enable row level security;

create policy "Users read their own webhook subs"
  on public.webhook_subscriptions for select using (user_id = auth.uid());
create policy "Users insert their own webhook subs"
  on public.webhook_subscriptions for insert with check (user_id = auth.uid());
create policy "Users delete their own webhook subs"
  on public.webhook_subscriptions for delete using (user_id = auth.uid());
