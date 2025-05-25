-- Supabase schema setup for profiles and posts
-- Ensures posts can reference profiles without foreign-key errors

-- Create the profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid references auth.users(id) primary key,
  username text unique,
  display_name text,
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Enable Row Level Security and define basic policies
alter table public.profiles enable row level security;
create policy "Allow anyone to read profiles"
  on public.profiles for select using ( true );
create policy "Users can update their own profile"
  on public.profiles for update using ( auth.uid() = id );

-- Create posts table referencing profiles(id)
create extension if not exists "uuid-ossp";
create table if not exists public.posts (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    username text not null,
    content text not null,
    created_at timestamptz not null default now()
);

-- Enable Row Level Security and allow cross-user access
alter table public.posts enable row level security;

-- Any authenticated user can insert a post linked to their profile
create policy "Users can insert posts" on public.posts
  for insert with check (auth.uid() = user_id);

-- All posts are publicly readable so the feed shows every user's posts
create policy "Anyone can read posts" on public.posts
  for select using (true);

-- Add the username column only if it doesn't exist (for older setups)
alter table public.posts add column if not exists username text;

-- Create replies table referencing posts and profiles
create table if not exists public.replies (
    id uuid primary key default uuid_generate_v4(),
    post_id uuid references public.posts(id) on delete cascade,
    parent_id uuid references public.replies(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    username text not null,
    content text not null,
    created_at timestamptz not null default now()
);
alter table public.replies enable row level security;
create policy "Users can insert replies" on public.replies
  for insert with check (auth.uid() = user_id);
create policy "Anyone can read replies" on public.replies
  for select using (true);

-- Example: insert a profile row so posting succeeds for a user
-- Replace the UUID and username with your values
insert into public.profiles (id, username, display_name)
values ('00000000-0000-0000-0000-000000000000', 'some_username', 'Some Name')
on conflict (id) do nothing;
