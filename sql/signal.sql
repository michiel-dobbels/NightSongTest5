-- Schema for storing public Signal keys
create table if not exists public.signal_keys (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    identity_key_public text not null,
    signed_prekey_public text not null,
    one_time_prekeys text[] not null,
    created_at timestamptz not null default now()
);

alter table public.signal_keys enable row level security;
create policy "Anyone can view signal keys" on public.signal_keys
  for select using (true);
create policy "Users manage their signal keys" on public.signal_keys
  for insert with check (auth.uid() = user_id);
create policy "Users update their signal keys" on public.signal_keys
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete their signal keys" on public.signal_keys
  for delete using (auth.uid() = user_id);
