-- Allow users to delete their own posts
create policy "Users can delete their posts" on public.posts
  for delete using (auth.uid() = user_id);
