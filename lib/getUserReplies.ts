import { supabase } from './supabase';

export interface Reply {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  image_url?: string | null;
  video_url?: string | null;
  created_at: string;
  reply_count?: number;
  like_count?: number;
  username?: string;
  profiles?: {
    username: string | null;
    name: string | null;
    image_url?: string | null;
    banner_url?: string | null;
  } | null;
}

export interface Post {
  id: string;
  content: string;
  image_url?: string | null;
  video_url?: string | null;
  user_id: string;
  created_at: string;
  reply_count?: number;
  like_count?: number;
  username?: string | null;
  profiles?: {
    username: string | null;
    name: string | null;
    image_url?: string | null;
    banner_url?: string | null;
  } | null;
}

export interface ReplyThread {
  reply: Reply;
  post: Post | null;
  parent?: Reply | null;
}

export async function getUserReplies(userId: string): Promise<ReplyThread[]> {
  const { data: replies, error } = await supabase
    .from('replies')
    .select(
      'id, post_id, parent_id, user_id, content, image_url, video_url, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch replies', error);
    throw error;
  }

  const postIds = Array.from(new Set((replies ?? []).map(r => r.post_id)));
  let postsMap: Record<string, Post | undefined> = {};
  if (postIds.length) {
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(
        'id, content, image_url, video_url, user_id, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)'
      )
      .in('id', postIds);
    if (postsError) {
      console.error('Failed to fetch posts', postsError);
      throw postsError;
    }
    postsMap = Object.fromEntries((posts ?? []).map(p => [p.id, p as Post]));
  }

  const parentIds = Array.from(
    new Set((replies ?? []).map(r => r.parent_id).filter(Boolean) as string[])
  );
  let parentsMap: Record<string, Reply | undefined> = {};
  if (parentIds.length) {
    const { data: parents, error: parentsError } = await supabase
      .from('replies')
      .select(
        'id, post_id, parent_id, user_id, content, image_url, video_url, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)'
      )
      .in('id', parentIds);
    if (parentsError) {
      console.error('Failed to fetch parent replies', parentsError);
      throw parentsError;
    }
    parentsMap = Object.fromEntries((parents ?? []).map(p => [p.id, p as Reply]));
  }

  return (replies ?? []).map(r => ({
    reply: r as Reply,
    post: postsMap[r.post_id] ?? null,
    parent: r.parent_id ? parentsMap[r.parent_id] ?? null : null,
  }));
}
