-- Table for user stories
create extension if not exists "uuid-ossp";

create table if not exists public.stories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  caption text,
  created_at timestamptz not null default now()
);

alter table public.stories enable row level security;

-- Only the owner can create/read/delete stories for now
create policy "Users can insert stories"
  on public.stories for insert
  with check (auth.uid() = user_id);

create policy "Users can read their stories"
  on public.stories for select
  using (auth.uid() = user_id);

create policy "Users can delete their stories"
  on public.stories for delete
  using (auth.uid() = user_id);
