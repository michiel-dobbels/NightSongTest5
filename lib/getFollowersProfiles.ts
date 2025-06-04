import { supabase } from './supabase';

export interface FollowerProfile {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export async function getFollowersProfiles(userId: string): Promise<FollowerProfile[]> {
  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId);

  if (followsError) {
    console.error('Failed to fetch followers list', followsError);
    throw followsError;
  }

  const ids = (follows ?? []).map(f => f.follower_id);
  if (ids.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('username, display_name, image_url')
    .in('id', ids);

  if (profileError) {
    console.error('Failed to fetch profiles', profileError);
    throw profileError;
  }

  return (profiles ?? []).map(p => ({
    username: p.username ?? null,
    full_name: p.display_name ?? null,
    avatar_url: p.image_url ?? null,
  }));
}
