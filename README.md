# NightSong App Setup

This project uses [Supabase](https://supabase.com) for authentication and storing posts. Before running the app you need to configure your Supabase project.

1. Create a new project in Supabase.
2. Open the SQL editor and run `sql/setup.sql`, `sql/profiles.sql` **and** `sql/likes.sql` from this repo. This creates the required tables (including nested replies) and row‑level security policies so posts persist across sessions and are visible to all users. Replies can be nested indefinitely by replying to any reply in the thread. The `likes` table with triggers keeps like counts in sync. The setup also adds an `avatar_url` column on `profiles` for profile pictures.
3. In Supabase Storage create a public bucket named `avatars` for profile pictures.
4. Copy your project's URL and `anon` key into `lib/supabase.js`.
5. Install dependencies with `npm install`.

With the database configured you can run `npm start` to launch the Expo app.
