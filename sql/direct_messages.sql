-- Schema for direct messaging conversations and messages
create extension if not exists "uuid-ossp";

create table if not exists public.conversations (
    id uuid primary key default uuid_generate_v4(),
    participant_1 uuid references public.profiles(id) on delete cascade,
    participant_2 uuid references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (participant_1, participant_2)
);

alter table public.conversations enable row level security;
create policy "Participants can view conversations" on public.conversations
  for select using (
    auth.uid() = participant_1 or auth.uid() = participant_2
  );
create policy "Participants can create conversations" on public.conversations
  for insert with check (
    auth.uid() = participant_1 or auth.uid() = participant_2
  );

create table if not exists public.messages (
    id uuid primary key default uuid_generate_v4(),
    conversation_id uuid references public.conversations(id) on delete cascade,
    sender_id uuid references public.profiles(id) on delete cascade,
    text text,
    created_at timestamptz not null default now()
);

alter table public.messages enable row level security;
create policy "Participants can view messages" on public.messages
  for select using (
    auth.uid() = sender_id or
    auth.uid() = (select participant_1 from public.conversations c where c.id = conversation_id) or
    auth.uid() = (select participant_2 from public.conversations c where c.id = conversation_id)
  );
create policy "Participants can send messages" on public.messages
  for insert with check (
    auth.uid() = sender_id and (
      auth.uid() = (select participant_1 from public.conversations c where c.id = conversation_id) or
      auth.uid() = (select participant_2 from public.conversations c where c.id = conversation_id)
    )
  );
