# NightSong App Setup

This project uses [Supabase](https://supabase.com) for authentication and storing posts. Before running the app you need to configure your Supabase project.

1. Create a new project in Supabase.
2. Open the SQL editor and run `sql/setup.sql`, `sql/profiles.sql`, `sql/likes.sql` **and** `sql/follows.sql` from this repo. This creates the required tables (including nested replies) and row‑level security policies so posts persist across sessions and are visible to all users. The profiles script also adds `image_url` and `banner_url` columns so your avatar and banner images stay saved. Replies can be nested indefinitely by replying to any reply in the thread. The `likes` table with triggers keeps like counts in sync. The new `follows` table prevents duplicate follows and enforces that users can only follow on their own behalf.


3. Copy your project's URL and `anon` key into `lib/supabase.js`.
4. Install dependencies with `npm install`.

With the database configured you can run `npm start` to launch the Expo app.
