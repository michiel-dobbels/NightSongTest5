import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function useStoryStatus(userId: string) {
  const [hasStory, setHasStory] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('stories')
        .select('id')
        .eq('user_id', userId)
        .gt('created_at', since)
        .limit(1);
      if (mounted) setHasStory((data?.length ?? 0) > 0);
    };
    fetchStatus();
    return () => {
      mounted = false;
    };
  }, [userId]);

  return hasStory;
}
