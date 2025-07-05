-- Notifications table and security policies
create extension if not exists "uuid-ossp";
create table if not exists public.notifications (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    sender_id uuid references public.profiles(id) on delete cascade,
    recipient_id uuid references public.profiles(id) on delete cascade,
    type text not null,
    entity_id uuid,
    message text,
    read boolean not null default false,
    created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users read their notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users manage their notifications" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users delete their notifications" on public.notifications
  for delete using (auth.uid() = user_id);

create policy "Authenticated create notifications" on public.notifications
  for insert with check (auth.uid() = user_id);
