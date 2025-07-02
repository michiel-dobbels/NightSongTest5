import { supabase } from './supabase';

export interface FollowerProfile {
  id: string;
  username: string | null;
  name: string | null;
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

  let { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, name, avatar_url')

    .in('id', ids);

  if (profileError?.code === '42703') {
    const retry = await supabase
      .from('profiles')
      .select('id, username, display_name, image_url')

      .in('id', ids);
    profiles = retry.data;
    profileError = retry.error;
  }

  if (profileError) {
    console.error('Failed to fetch profiles', profileError);
    throw profileError;
  }

  return (profiles ?? []).map(p => ({
    id: (p as any).id,
    username: p.username ?? null,
    name:
      (p as any).name ??
      (p as any).display_name ??
      (p as any).full_name ??
      null,
    avatar_url:
      (p as any).avatar_url ??
      (p as any).image_url ??
      null,

  }));
}
