import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function useStoryAvailability(userIds: string[]) {
  const [map, setMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setMap({});
      return;
    }
    const fetchStories = async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('user_id')
        .in('user_id', userIds)
        .gt('expires_at', new Date().toISOString());
      if (!error && data) {
        const m: Record<string, boolean> = {};
        data.forEach(s => {
          m[s.user_id] = true;
        });
        setMap(m);
      }
    };
    fetchStories();
  }, [JSON.stringify(userIds)]);

  return map;
}
