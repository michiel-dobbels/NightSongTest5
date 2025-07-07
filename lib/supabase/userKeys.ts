import { supabase } from '../supabase';

export async function uploadUserKey(userId: string, publicKey: string) {
  const { data: existing, error: fetchError } = await supabase
    .from('user_keys')
    .select('user_id')
    .eq('user_id', userId)
    .single();
  if (fetchError && fetchError.code !== 'PGRST116' && fetchError.code !== 'PGRST204') {
    console.error('Failed checking existing key', fetchError);
  }
  if (existing) return;
  const { error } = await supabase.from('user_keys').insert({ user_id: userId, public_key: publicKey });
  if (error) {
    console.error('Failed to upload user key', error);
  }
}
