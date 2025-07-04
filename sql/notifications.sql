-- Notifications table to inform users of actions like post likes
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  type text not null,
  message text,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can insert notifications" on public.notifications
  for insert with check (auth.uid() = actor_id);

create policy "Users can read notifications" on public.notifications
  for select using (auth.uid() = user_id);
