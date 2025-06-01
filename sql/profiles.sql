-- Policy to allow users to create their own profile
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Add banner_url column if it doesn't exist so banners persist
alter table public.profiles add column if not exists banner_url text;

