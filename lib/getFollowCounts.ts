import { supabase } from './supabase';

export async function getFollowCounts(userId: string) {
  const followersRes = await supabase
    .from('follows')
    .select('*', { count: 'exact' })
    .eq('following_id', userId);

  if (followersRes.error) {
    console.error('Failed to fetch followers count', followersRes.error);
    throw followersRes.error;
  }

  const followingRes = await supabase
    .from('follows')
    .select('*', { count: 'exact' })
    .eq('follower_id', userId);

  if (followingRes.error) {
    console.error('Failed to fetch following count', followingRes.error);
    throw followingRes.error;
  }

  return {
    followersCount: followersRes.count ?? 0,
    followingCount: followingRes.count ?? 0,
  };
}
