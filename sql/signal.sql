-- Tables for storing Signal public keys
create table if not exists public.signal_keys (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  identity_key text not null,
  registration_id integer not null,
  pre_key_id integer not null,
  pre_key text not null,
  signed_pre_key_id integer not null,
  signed_pre_key text not null
);

alter table public.signal_keys enable row level security;
create policy "Users manage their signal keys" on public.signal_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
