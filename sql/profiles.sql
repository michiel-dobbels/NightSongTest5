-- Policy to allow users to create their own profile
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);


alter table public.profiles add column if not exists image_url text;

