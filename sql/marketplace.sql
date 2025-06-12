-- Schema for marketplace listings
create extension if not exists "uuid-ossp";

-- Vehicle related enums
create type if not exists public.vehicle_type_enum as enum ('car','motorcycle','van','truck','other');
create type if not exists public.fuel_type_enum as enum ('petrol','diesel','electric','hybrid');
create type if not exists public.transmission_type_enum as enum ('manual','automatic');

-- Listings table
create table if not exists public.market_listings (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    description text,
    price numeric,
    location text,
    image_urls text[] default '{}',
    vehicle_type vehicle_type_enum,
    brand text,
    model text,
    year integer,
    mileage integer,
    fuel_type fuel_type_enum,
    transmission transmission_type_enum,
    is_boosted boolean not null default false,
    views integer not null default 0,
    favorites integer not null default 0,
    search_index text,
    created_at timestamptz not null default now()
);

alter table public.market_listings enable row level security;
create policy "Anyone can view listings" on public.market_listings
  for select using (true);
create policy "Users can insert listings" on public.market_listings
  for insert with check (auth.uid() = user_id);
create policy "Users can update their listings" on public.market_listings
  for update using (auth.uid() = user_id);
create policy "Users can delete their listings" on public.market_listings
  for delete using (auth.uid() = user_id);

-- Favorites table
create table if not exists public.market_favorites (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    listing_id uuid not null references public.market_listings(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (user_id, listing_id)
);

alter table public.market_favorites enable row level security;
create policy "Users can favorite" on public.market_favorites
  for insert with check (auth.uid() = user_id);
create policy "Users can unfavorite" on public.market_favorites
  for delete using (auth.uid() = user_id);
create policy "Anyone can read favorites" on public.market_favorites
  for select using (true);

-- Trigger functions for favorites count
create or replace function public.increment_listing_favorites() returns trigger as $$
begin
  update public.market_listings set favorites = favorites + 1 where id = new.listing_id;
  return new;
end;
$$ language plpgsql;

create or replace function public.decrement_listing_favorites() returns trigger as $$
begin
  update public.market_listings set favorites = favorites - 1 where id = old.listing_id;
  return old;
end;
$$ language plpgsql;

create trigger market_favorite_insert
  after insert on public.market_favorites
  for each row execute procedure public.increment_listing_favorites();
create trigger market_favorite_delete
  after delete on public.market_favorites
  for each row execute procedure public.decrement_listing_favorites();

-- Simple helper to increment views when a listing is opened
create or replace function public.increment_listing_views(p_listing_id uuid)
returns void as $$
begin
  update public.market_listings
  set views = views + 1
  where id = p_listing_id;
end;
$$ language plpgsql;
