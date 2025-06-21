-- Stories table for ephemeral user stories
create extension if not exists "uuid-ossp";
create table if not exists public.stories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  overlay_text text,
  created_at timestamptz not null default now()
);

alter table public.stories enable row level security;

create policy "Users can insert stories" on public.stories
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their stories" on public.stories
  for delete using (auth.uid() = user_id);

create policy "Anyone can read stories" on public.stories
  for select using (true);
