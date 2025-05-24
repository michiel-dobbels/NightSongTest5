# NightSong App Setup

This project uses [Supabase](https://supabase.com) for authentication and storing posts. Before running the app you need to configure your Supabase project.

1. Create a new project in Supabase.
2. Open the SQL editor and run the scripts `sql/setup.sql` and `sql/profiles.sql` from this repo. These scripts create the required tables (including replies), policies, and the profile insertion rule so posts and replies persist across sessions and are visible to all users.
3. Copy your project's URL and `anon` key into `lib/supabase.js`.
4. Install dependencies with `npm install`.

With the database configured you can run `npm start` to launch the Expo app.
