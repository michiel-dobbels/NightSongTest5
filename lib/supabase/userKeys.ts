import { supabase } from '../supabase';

export async function uploadUserKey(userId: string, publicKey: string) {
  const session = supabase.auth.session(); // ✅ FIXED
  console.log('🧠 Supabase session before insert:', session);

  if (!session) {
    console.warn('❌ No session — skipping key upload');
    return;
  }

  console.log('📤 uploadUserKey() called with:', userId, publicKey);

  const { data: existing, error: fetchError } = await supabase
    .from('user_keys')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116' && fetchError.code !== 'PGRST204') {
    console.error('❌ Failed checking existing key:', fetchError);
  }

  if (existing) return;

  const { error } = await supabase
    .from('user_keys')
    .insert({ user_id: userId, public_key: publicKey });

  if (error) {
    console.error('❌ Failed to upload user key:', error);
  } else {
    console.log('✅ Successfully inserted user key for:', userId);
  }
}
