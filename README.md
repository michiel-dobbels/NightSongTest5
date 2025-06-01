# NightSong App Setup

This project uses [Supabase](https://supabase.com) for authentication and storing posts. Before running the app you need to configure your Supabase project.

1. Create a new project in Supabase.
2. Open the SQL editor and run `sql/setup.sql`, `sql/profiles.sql` **and** `sql/likes.sql` from this repo. This creates the required tables (including nested replies) and row‑level security policies so posts persist across sessions and are visible to all users. Replies can be nested indefinitely by replying to any reply in the thread. The `likes` table with triggers keeps like counts in sync.
   - Create a storage bucket called `profile-images` and enable public access so profile pictures can be stored. Run the updated `sql/setup.sql` to grant authenticated users permission to upload images to this bucket.



3. Copy your project's URL and `anon` key into `lib/supabase.js`.
4. Install dependencies with `npm install`.

With the database configured you can run `npm start` to launch the Expo app.
