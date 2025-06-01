-- Supabase schema setup for profiles and posts
-- Ensures posts can reference profiles without foreign-key errors

-- Create the profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid references auth.users(id) primary key,
  username text unique,
  display_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Enable Row Level Security and define basic policies
alter table public.profiles enable row level security;
create policy "Allow anyone to read profiles"
  on public.profiles for select using ( true );
create policy "Users can update their own profile"
  on public.profiles for update using ( auth.uid() = id );

alter table public.profiles add column if not exists avatar_url text;

-- Allow authenticated users to upload profile images
alter table storage.objects enable row level security;
create policy "Auth users can upload profile images" on storage.objects
  for insert with check (
    bucket_id = 'profile-images' and auth.role() = 'authenticated'
  );
create policy "Auth users can replace profile images" on storage.objects
  for update using (
    bucket_id = 'profile-images' and auth.role() = 'authenticated'
  );

-- Create posts table referencing profiles(id)
create extension if not exists "uuid-ossp";
create table if not exists public.posts (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    username text not null,
    content text not null,
    created_at timestamptz not null default now(),
    reply_count integer not null default 0
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
alter table public.posts add column if not exists reply_count integer not null default 0;
alter table public.posts add column if not exists image_url text;
alter table public.replies add column if not exists reply_count integer not null default 0;
alter table public.replies add column if not exists image_url text;


-- Create replies table referencing posts and profiles
create table if not exists public.replies (
    id uuid primary key default uuid_generate_v4(),
    post_id uuid references public.posts(id) on delete cascade,
    parent_id uuid references public.replies(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    username text not null,
    content text not null,
    created_at timestamptz not null default now(),
    reply_count integer not null default 0
);
alter table public.replies enable row level security;
create policy "Users can insert replies" on public.replies
  for insert with check (auth.uid() = user_id);
create policy "Anyone can read replies" on public.replies
  for select using (true);
alter table public.replies add column if not exists reply_count integer not null default 0;

-- Maintain reply_count automatically
create or replace function public.increment_reply_counts() returns trigger as $$
declare
  current uuid := new.parent_id;
begin
  update public.posts set reply_count = reply_count + 1 where id = new.post_id;
  while current is not null loop
    update public.replies set reply_count = reply_count + 1 where id = current;
    select parent_id into current from public.replies where id = current;
  end loop;
  return new;
end;
$$ language plpgsql;

create or replace function public.decrement_reply_counts() returns trigger as $$
declare
  current uuid := old.parent_id;
begin
  update public.posts set reply_count = reply_count - 1 where id = old.post_id;
  while current is not null loop
    update public.replies set reply_count = reply_count - 1 where id = current;
    select parent_id into current from public.replies where id = current;
  end loop;
  return old;
end;
$$ language plpgsql;

create trigger reply_insert after insert on public.replies
for each row execute procedure public.increment_reply_counts();

create trigger reply_delete after delete on public.replies
for each row execute procedure public.decrement_reply_counts();

create or replace function public.increment_reply_counts() returns trigger as $$
declare
  ancestor uuid;
begin
  update public.posts set reply_count = reply_count + 1 where id = NEW.post_id;
  ancestor := NEW.parent_id;
  while ancestor is not null loop
    update public.replies set reply_count = reply_count + 1 where id = ancestor;
    select parent_id into ancestor from public.replies where id = ancestor;
  end loop;
  return NEW;
end;
$$ language plpgsql;

create or replace function public.decrement_reply_counts() returns trigger as $$
declare
  ancestor uuid;
  removed integer;
begin
  removed := OLD.reply_count + 1;
  update public.posts set reply_count = reply_count - removed where id = OLD.post_id;
  ancestor := OLD.parent_id;
  while ancestor is not null loop
    update public.replies set reply_count = reply_count - removed where id = ancestor;
    select parent_id into ancestor from public.replies where id = ancestor;
  end loop;
  return OLD;
end;
$$ language plpgsql;

create trigger reply_insert_count after insert on public.replies
  for each row execute procedure public.increment_reply_counts();

create trigger reply_delete_count after delete on public.replies
  for each row execute procedure public.decrement_reply_counts();

-- Maintain nested reply counts for posts and replies
create or replace function public.increment_reply_counts() returns trigger as $$
declare
  current uuid;
begin
  update public.posts set reply_count = reply_count + 1 where id = NEW.post_id;
  current := NEW.parent_id;
  while current is not null loop
    update public.replies set reply_count = reply_count + 1
      where id = current
      returning parent_id into current;
  end loop;
  return NEW;
end;
$$ language plpgsql;

create or replace function public.decrement_reply_counts() returns trigger as $$
declare
  current uuid;
begin
  update public.posts set reply_count = reply_count - 1 where id = OLD.post_id;
  current := OLD.parent_id;
  while current is not null loop
    update public.replies set reply_count = reply_count - 1
      where id = current
      returning parent_id into current;
  end loop;
  return OLD;
end;
$$ language plpgsql;

create trigger replies_insert_reply_count
after insert on public.replies
for each row execute procedure public.increment_reply_counts();

create trigger replies_delete_reply_count
after delete on public.replies
for each row execute procedure public.decrement_reply_counts();

-- Example: insert a profile row so posting succeeds for a user
-- Replace the UUID and username with your values
insert into public.profiles (id, username, display_name)
values ('00000000-0000-0000-0000-000000000000', 'some_username', 'Some Name')
on conflict (id) do nothing;

-- Create likes table for posts and replies
create table if not exists public.likes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    post_id uuid references public.posts(id) on delete cascade,
    reply_id uuid references public.replies(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint one_target check (
      (post_id is not null and reply_id is null) or
      (post_id is null and reply_id is not null)
    ),
    unique (user_id, post_id, reply_id)
);
alter table public.likes enable row level security;
create policy "Users can insert likes" on public.likes
  for insert with check (auth.uid() = user_id);
create policy "Users can delete their likes" on public.likes
  for delete using (auth.uid() = user_id);
create policy "Anyone can read likes" on public.likes
  for select using (true);

alter table public.posts
  add column if not exists like_count integer not null default 0;
alter table public.replies
  add column if not exists like_count integer not null default 0;

create or replace function public.increment_like_count() returns trigger as $$
begin
  if NEW.post_id is not null then
    update public.posts set like_count = like_count + 1 where id = NEW.post_id;
  elsif NEW.reply_id is not null then
    update public.replies set like_count = like_count + 1 where id = NEW.reply_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

create or replace function public.decrement_like_count() returns trigger as $$
begin
  if OLD.post_id is not null then
    update public.posts set like_count = like_count - 1 where id = OLD.post_id;
  elsif OLD.reply_id is not null then
    update public.replies set like_count = like_count - 1 where id = OLD.reply_id;
  end if;
  return OLD;
end;
$$ language plpgsql;

create trigger like_insert after insert on public.likes
for each row execute procedure public.increment_like_count();

create trigger like_delete after delete on public.likes
for each row execute procedure public.decrement_like_count();
