// utils/fetchPublicKey.ts
import { supabase } from '../lib/supabase';

export async function fetchPublicKey(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('signal_keys')
    .select('identity_key_public')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('Failed to fetch public key');
  }

  return data.identity_key_public;
}
