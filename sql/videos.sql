-- Table for storing video posts
create extension if not exists "uuid-ossp";

create table if not exists public.videos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  video_url text not null,
  created_at timestamptz not null default now()
);

alter table public.videos enable row level security;

create policy "Users can insert videos" on public.videos
  for insert with check (auth.uid() = user_id);

create policy "Anyone can read videos" on public.videos
  for select using (true);

create policy "Users can delete their videos" on public.videos
  for delete using (auth.uid() = user_id);
