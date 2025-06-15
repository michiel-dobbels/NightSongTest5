# NightSong App Setup

This project uses [Supabase](https://supabase.com) for authentication and storing posts. Before running the app you need to configure your Supabase project.

1. Create a new project in Supabase.
2. Open the SQL editor and run `sql/setup.sql`, `sql/profiles.sql`, `sql/likes.sql`, `sql/follows.sql`, `sql/videos.sql` **and** `sql/marketplace.sql` from this repo. This creates the required tables (including nested replies) and row‑level security policies so posts persist across sessions and are visible to all users. The profiles script also adds `image_url` and `banner_url` columns so your avatar and banner images stay saved. Replies can be nested indefinitely by replying to any reply in the thread. The `likes` table with triggers keeps like counts in sync. The new `follows` table prevents duplicate follows and enforces that users can only follow on their own behalf. The `videos` table stores video URLs for the feed. The `marketplace` script sets up car listings and favorites so you can buy and sell vehicles. It also includes future‑proof fields like `is_boosted`, `views`, `favorites` and `search_index` for promoted listings and search.



3. Create a public storage bucket named `market-images` in Supabase so listing images can be uploaded. Then run `sql/storage.sql` to allow authenticated users to upload and everyone to view images.

4. Copy your project's URL and `anon` key into `lib/supabase.js`.
5. Install dependencies with `npm install`.
6. Add your logo image as `assets/AppIcon.png` to show it on startup.


With the database configured you can run `npm start` to launch the Expo app.

The marketplace screens live under `app/screens` and use a dark theme. The primary background color is `#2c2c54` and interactive elements use the accent color `#0070f3`.
