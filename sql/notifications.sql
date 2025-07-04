-- Notifications for likes
create extension if not exists "uuid-ossp";
create table if not exists public.notifications (
    id uuid primary key default uuid_generate_v4(),
    recipient_id uuid references public.profiles(id) on delete cascade,
    sender_id uuid references public.profiles(id) on delete cascade,
    post_id uuid references public.posts(id) on delete cascade,
    type text not null default 'like',
    read boolean not null default false,
    created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "Notification owners can read" on public.notifications
  for select using (recipient_id = auth.uid());
create policy "Notification owners can update" on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "Notification owners can delete" on public.notifications
  for delete using (recipient_id = auth.uid());

create or replace function public.create_like_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  author uuid;
begin
  if new.post_id is not null then
    select user_id into author from public.posts where id = new.post_id;
    if author is not null and author <> new.user_id then
      insert into public.notifications (recipient_id, sender_id, post_id, type)
      values (author, new.user_id, new.post_id, 'like');
    end if;
  end if;
  return new;
end;
$$;

create trigger notify_like
after insert on public.likes
for each row execute procedure public.create_like_notification();
