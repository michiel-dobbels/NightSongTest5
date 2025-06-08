import { supabase } from './supabase';

export async function getLikeCounts(
  ids: string[],
  isReply: boolean = false,
): Promise<Record<string, number | undefined>> {
  const counts: Record<string, number | undefined> = {};
  await Promise.all(
    ids.map(async id => {
      const { data, error, count } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .match(isReply ? { reply_id: id } : { post_id: id });
      if (!error && typeof count === 'number') {
        counts[id] = count;
      }
    }),
  );
  return counts;
}
