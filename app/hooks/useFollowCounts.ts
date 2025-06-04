import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function useFollowCounts(userId: string | null) {
  const [followers, setFollowers] = useState<number | null>(null);
  const [following, setFollowing] = useState<number | null>(null);

  const fetchCounts = async () => {
    if (!userId) return;
    const followersPromise = supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId);

    const followingPromise = supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId);

    const [followersRes, followingRes] = await Promise.all([
      followersPromise,
      followingPromise,
    ]);

    if (!followersRes.error) {
      setFollowers(followersRes.count ?? 0);
    } else {
      console.error('Failed to fetch followers', followersRes.error);
    }

    if (!followingRes.error) {
      setFollowing(followingRes.count ?? 0);
    } else {
      console.error('Failed to fetch following', followingRes.error);
    }
  };

  useEffect(() => {
    if (!userId) {
      setFollowers(null);
      setFollowing(null);
      return;
    }

    fetchCounts();
    return () => {};
  }, [userId]);

  return { followers, following, refresh: fetchCounts };
}
