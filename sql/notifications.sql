create table if not exists public.notifications (
    id uuid primary key default uuid_generate_v4(),
    recipient_id uuid references public.profiles(id) on delete cascade,
    sender_id uuid references public.profiles(id) on delete cascade,
    type text not null check (type in ('like','reply','follow')),
    entity_id uuid,
    message text not null,
    read boolean not null default false,
    created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can insert notifications" on public.notifications
  for insert with check (auth.uid() = sender_id);

create policy "Users can read their notifications" on public.notifications
  for select using (recipient_id = auth.uid());

create policy "Users can update their notifications" on public.notifications
  for update using (recipient_id = auth.uid());
