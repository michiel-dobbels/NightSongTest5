import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function useLiveReplyCount(postId: string, initialCount: number = 0) {
  const [count, setCount] = useState<number>(initialCount);

  useEffect(() => {
    if (!postId) return;
    let isMounted = true;
    let subscription: any;

    const fetchCount = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('reply_count')
        .eq('id', postId)
        .single();
      if (!error && data && isMounted) {
        setCount(data.reply_count ?? 0);
      }
    };

    fetchCount();

    subscription = supabase
      .from(`replies:post_id=eq.${postId}`)
      .on('INSERT', fetchCount)
      .on('DELETE', fetchCount)
      .subscribe();

    return () => {
      isMounted = false;
      if (subscription) {
        supabase.removeSubscription(subscription);
      }
    };
  }, [postId]);

  return count;
}
