-- Store Signal protocol identity public keys
create table if not exists public.signal_identities (
    user_id uuid references public.profiles(id) on delete cascade primary key,
    identity_key text not null,
    registration_id integer not null,
    created_at timestamptz not null default now()
);

alter table public.signal_identities enable row level security;

create policy "Anyone can read signal identities" on public.signal_identities
  for select using (true);
create policy "Users can insert signal identity" on public.signal_identities
  for insert with check (auth.uid() = user_id);
create policy "Users can update their signal identity" on public.signal_identities
  for update using (auth.uid() = user_id);
