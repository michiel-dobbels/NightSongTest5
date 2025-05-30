-- Adds like support for posts and replies

-- Add like_count columns if they don't exist
alter table public.posts add column if not exists like_count integer not null default 0;
alter table public.replies add column if not exists like_count integer not null default 0;

-- Table to store per-user likes
create table if not exists public.likes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.profiles(id) on delete cascade,
    post_id uuid references public.posts(id) on delete cascade,
    reply_id uuid references public.replies(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint one_target check ((post_id is not null) <> (reply_id is not null)),
    constraint unique_post_like unique (user_id, post_id),
    constraint unique_reply_like unique (user_id, reply_id)
);

alter table public.likes enable row level security;

create policy "Users can like" on public.likes
  for insert with check (auth.uid() = user_id);
create policy "Users can unlike" on public.likes
  for delete using (auth.uid() = user_id);
create policy "Anyone can read likes" on public.likes
  for select using (true);

-- Trigger functions to maintain like counts
create or replace function public.increment_like_count() returns trigger as $$
begin
  if new.post_id is not null then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif new.reply_id is not null then
    update public.replies set like_count = like_count + 1 where id = new.reply_id;
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function public.decrement_like_count() returns trigger as $$
begin
  if old.post_id is not null then
    update public.posts set like_count = like_count - 1 where id = old.post_id;
  elsif old.reply_id is not null then
    update public.replies set like_count = like_count - 1 where id = old.reply_id;
  end if;
  return old;
end;
$$ language plpgsql;

create trigger like_insert
after insert on public.likes
for each row execute procedure public.increment_like_count();

create trigger like_delete
after delete on public.likes
for each row execute procedure public.decrement_like_count();
