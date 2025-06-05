export interface Post {
  id: string;
  content: string;
  image_url?: string;
  username?: string;
  user_id: string;
  created_at: string;
  reply_count?: number;
  like_count?: number;
  profiles?: {
    username: string | null;
    name: string | null;
    image_url?: string | null;
    banner_url?: string | null;
  } | null;
}
