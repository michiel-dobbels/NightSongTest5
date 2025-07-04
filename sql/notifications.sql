-- Table for storing simple in-app notifications
create extension if not exists "uuid-ossp";

create table if not exists public.notifications (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.profiles(id) on delete cascade,
    message text not null,
    created_at timestamptz not null default now(),
    read boolean not null default false
);

alter table public.notifications enable row level security;
-- Users can only see their own notifications
create policy "Users can view notifications" on public.notifications
  for select using (auth.uid() = user_id);
-- Allow any authenticated user to create a notification (e.g. when liking a post)
create policy "Users can create notifications" on public.notifications
  for insert with check (auth.role() = 'authenticated');
-- Users can mark notifications read or delete them
create policy "Users can modify notifications" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete notifications" on public.notifications
  for delete using (auth.uid() = user_id);
