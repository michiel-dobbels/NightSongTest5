import { supabase } from './supabase';

export interface FollowingProfile {
  username: string | null;
  name: string | null;

  avatar_url: string | null;
}

export async function getFollowingProfiles(userId: string): Promise<FollowingProfile[]> {
  // Fetch the ids this user is following
  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (followsError) {
    console.error('Failed to fetch following list', followsError);
    throw followsError;
  }

  const ids = (follows ?? []).map(f => f.following_id);
  if (ids.length === 0) return [];

  // Look up the corresponding profiles
  let { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('username, name, avatar_url')

    .in('id', ids);

  if (profileError?.code === '42703') {
    const retry = await supabase
      .from('profiles')
      .select('username, display_name, image_url')

      .in('id', ids);
    profiles = retry.data;
    profileError = retry.error;
  }


  if (profileError) {
    console.error('Failed to fetch profiles', profileError);
    throw profileError;
  }

  return (profiles ?? []).map(p => ({
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
