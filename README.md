# NightSong App Setup

This project uses [Supabase](https://supabase.com) for authentication and storing posts. Before running the app you need to configure your Supabase project.

1. Create a new project in Supabase.
2. Open the SQL editor and run `sql/setup.sql`, `sql/profiles.sql` **and** `sql/likes.sql` from this repo. This creates the required tables (including nested replies) and row‑level security policies so posts persist across sessions and are visible to all users. Replies can be nested indefinitely by replying to any reply in the thread. The `likes` table with triggers keeps like counts in sync.

   The updated `sql/setup.sql` adds an `avatar_url` column to the `profiles` table. Re-run the script if your database is missing this column.

3. In the **Storage** section of Supabase create a bucket named `profile-images` and make it public. Profile pictures uploaded by users are stored here. The bucket name is configured in `lib/supabase.js` via the `PROFILE_IMAGE_BUCKET` constant.
4. Run `sql/setup.sql` again to create the storage policies that allow authenticated users to upload to this bucket.
5. Copy your project's URL and `anon` key into `lib/supabase.js`.
6. Install dependencies with `npm install`.

With the database configured you can run `npm start` to launch the Expo app.
