import { supabase } from '../lib/supabase';
import { generateIdentityKeys } from './identity';

export async function uploadKeysToSupabase(userId: string) {
  const identity = await generateIdentityKeys();
  const signedPreKey = await generateIdentityKeys();
  const oneTimePreKeys = await Promise.all(
    Array.from({ length: 10 }, () => generateIdentityKeys())
  );

  const { error } = await supabase.from('signal_keys').upsert({
    user_id: userId,
    identity_key_public: identity.public,
    signed_prekey_public: signedPreKey.public,
    one_time_prekeys: oneTimePreKeys.map(k => k.public),
  });

  if (error) {
    console.error('Upload failed:', error.message);
    throw new Error('Key upload error');
  }

  return { identity, signedPreKey };
}
