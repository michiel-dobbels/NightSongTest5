-- Schema for storing public encryption keys for chat
create extension if not exists "uuid-ossp";

create table if not exists public.user_keys (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    public_key text not null,
    created_at timestamptz not null default now()
);

alter table public.user_keys enable row level security;

create policy "Anyone can read keys" on public.user_keys
  for select using (true);

create policy "Users can insert their key" on public.user_keys
  for insert with check (auth.uid() = user_id);

create policy "Users can update their key" on public.user_keys
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their key" on public.user_keys
  for delete using (auth.uid() = user_id);
