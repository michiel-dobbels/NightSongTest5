import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { storyEvents } from '../storyEvents';

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
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        );
      if (!error && data) {
        const m: Record<string, boolean> = {};
        data.forEach(s => {
          m[s.user_id] = true;
        });
        setMap(m);
      }
    };
    fetchStories();
    storyEvents.on('storyAdded', fetchStories);
    return () => {
      storyEvents.off('storyAdded', fetchStories);
    };
  }, [JSON.stringify(userIds)]);

  return map;
}
