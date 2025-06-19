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

-- Policies for the post-images storage bucket
insert into storage.buckets (id, name, public)
  values ('post-images', 'post-images', true)
  on conflict (id) do update set public = true;

-- Allow authenticated users to upload post images
create policy "Post image uploads" on storage.objects
  for insert with check (
    bucket_id = 'post-images' and auth.role() = 'authenticated'
  );

-- Allow anyone to read post images
create policy "Public post image access" on storage.objects
  for select using (bucket_id = 'post-images');

-- Policies for the post-videos storage bucket
insert into storage.buckets (id, name, public)
  values ('post-videos', 'post-videos', true)
  on conflict (id) do update set public = true;

-- Allow authenticated users to upload post videos
create policy "Post video uploads" on storage.objects
  for insert with check (
    bucket_id = 'post-videos' and auth.role() = 'authenticated'
  );

-- Allow anyone to read post videos
create policy "Public post video access" on storage.objects
  for select using (bucket_id = 'post-videos');

