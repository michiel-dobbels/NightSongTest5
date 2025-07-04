export type Post = {
  id: string;
  content: string;
  image_url?: string;
  username: string;
  created_at: string;
  reply_count?: number;
  like_count: number;
};
