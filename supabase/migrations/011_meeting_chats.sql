-- Store the Q&A chat history captured during a live meeting. Each row
-- is one turn (user question or assistant answer) tied to a meeting.
create table if not exists public.meeting_chats (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  turn_index int not null,
  transcript_length_at_ask int,
  created_at timestamptz not null default now()
);

create index if not exists meeting_chats_meeting_id_idx
  on public.meeting_chats (meeting_id, turn_index);

alter table public.meeting_chats enable row level security;

create policy "Users read their own meeting chats"
  on public.meeting_chats for select
  using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_chats.meeting_id and m.user_id = auth.uid()
    )
  );

create policy "Users insert chats on their own meetings"
  on public.meeting_chats for insert
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_chats.meeting_id and m.user_id = auth.uid()
    )
  );

create policy "Users delete chats on their own meetings"
  on public.meeting_chats for delete
  using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_chats.meeting_id and m.user_id = auth.uid()
    )
  );
