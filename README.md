# NightSong App Setup

This project uses [Supabase](https://supabase.com) for authentication and storing posts. Before running the app you need to configure your Supabase project.

1. Create a new project in Supabase.
2. Open the SQL editor and run `sql/setup.sql` from this repo. This creates the required tables (including replies) and row‑level security policies so posts persist across sessions and are visible to all users.
3. Copy your project's URL and `anon` key into `lib/supabase.js`.
4. Install dependencies with `npm install`.

With the database configured you can run `npm start` to launch the Expo app.
