-- Stores Google OAuth tokens per user so Briva can read their calendar.
-- One row per user (upsert on connect).
create table if not exists public.google_integrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_sub text,
  email text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scopes text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_integrations enable row level security;

create policy "Users read their own google integration"
  on public.google_integrations for select
  using (user_id = auth.uid());

create policy "Users insert their own google integration"
  on public.google_integrations for insert
  with check (user_id = auth.uid());

create policy "Users update their own google integration"
  on public.google_integrations for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users delete their own google integration"
  on public.google_integrations for delete
  using (user_id = auth.uid());

-- Allow linking a meeting to a specific Google Calendar event.
alter table public.meetings
  add column if not exists google_event_id text,
  add column if not exists google_event_summary text,
  add column if not exists google_event_start timestamptz;

create index if not exists meetings_google_event_id_idx
  on public.meetings (google_event_id) where google_event_id is not null;
