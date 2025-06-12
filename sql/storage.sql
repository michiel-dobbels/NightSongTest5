-- Policies for the market-images storage bucket
insert into storage.buckets (id, name, public)
  values ('market-images', 'market-images', true)
  on conflict (id) do update set public = true;

-- Allow authenticated users to upload objects to the bucket
create policy "Market image uploads" on storage.objects
  for insert with check (
    bucket_id = 'market-images' and auth.role() = 'authenticated'
  );

-- Allow anyone to read objects from the bucket
create policy "Public market image access" on storage.objects
  for select using (bucket_id = 'market-images');
