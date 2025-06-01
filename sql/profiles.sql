-- Policy to allow users to create their own profile
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Allow optional avatar_url column
alter table public.profiles
  add column if not exists avatar_url text;

