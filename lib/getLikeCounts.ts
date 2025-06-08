import { supabase } from './supabase';

export async function getLikeCounts(ids: string[], isReply: boolean = false): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  await Promise.all(
    ids.map(async id => {
      const { count } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .match(isReply ? { reply_id: id } : { post_id: id });
      counts[id] = typeof count === 'number' ? count : 0;
    })
  );
  return counts;
}
