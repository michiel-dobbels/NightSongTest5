-- Setup follows table for following relationships

-- Ensure pgcrypto is available for gen_random_uuid
create extension if not exists pgcrypto;

create table if not exists public.follows (
    id uuid primary key default gen_random_uuid(),
    follower_id uuid not null references auth.users(id),
    following_id uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    unique (follower_id, following_id)
);

alter table public.follows enable row level security;

create policy "Users can follow" on public.follows
  for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow" on public.follows
  for delete using (auth.uid() = follower_id);

create policy "Anyone can read follows" on public.follows
  for select using (true);
