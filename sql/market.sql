-- Market listings and favorites tables
create extension if not exists "uuid-ossp";

create type vehicle_type as enum ('car','motorcycle','van','truck','other');
create type fuel_type as enum ('petrol','diesel','electric','hybrid','other');
create type transmission_type as enum ('manual','automatic');

create table if not exists public.market_listings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text,
  description text,
  price numeric,
  location text,
  image_urls text[],
  vehicle_type vehicle_type,
  brand text,
  model text,
  year int,
  mileage int,
  fuel_type fuel_type,
  transmission transmission_type,
  is_boosted boolean default false,
  views integer not null default 0,
  favorites integer not null default 0,
  search_index text,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table public.market_listings enable row level security;
create policy "Public listings" on public.market_listings
  for select using (true);
create policy "Users can manage own listings" on public.market_listings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.market_favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  listing_id uuid references public.market_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

alter table public.market_favorites enable row level security;
create policy "Users can favorite" on public.market_favorites
  for insert with check (auth.uid() = user_id);
create policy "Users can unfavorite" on public.market_favorites
  for delete using (auth.uid() = user_id);
create policy "Favorites are public" on public.market_favorites
  for select using (true);
