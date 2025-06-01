# NightSong App Setup

This project uses [Supabase](https://supabase.com) for authentication and storing posts. Before running the app you need to configure your Supabase project.

1. Create a new project in Supabase.
2. Open the SQL editor and run `sql/setup.sql`, `sql/profiles.sql` **and** `sql/likes.sql` from this repo. This creates the required tables (including nested replies) and row‑level security policies so posts persist across sessions and are visible to all users. Replies can be nested indefinitely by replying to any reply in the thread. The `likes` table with triggers keeps like counts in sync.

   The updated `sql/setup.sql` also adds policies so authenticated users can upload to the `profile-images` bucket. Re-run the script if your database is missing the `avatar_url` column or these policies.

3. In the **Storage** section of Supabase create a bucket named `profile-images` and make it public. Profile pictures uploaded by users are stored here.
4. Copy your project's URL and `anon` key into `lib/supabase.js`.
5. Install dependencies with `npm install`.

With the database configured you can run `npm start` to launch the Expo app.
