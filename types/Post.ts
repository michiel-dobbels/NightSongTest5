export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  username?: string; // optionally joined from profiles
  liked?: boolean;   // optional field for client-side state
  like_count?: number;
  reply_count?: number;
}
