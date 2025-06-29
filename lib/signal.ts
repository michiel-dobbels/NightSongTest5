import { supabase } from '../lib/supabase';

export async function uploadKeysToSupabase(userId: string) {
  // Replace with real keys when ready
  const identityKey = 'example_identity_key';
  const signedPreKey = 'example_signed_pre_key';

  try {
    const { error, data } = await supabase
      .from('keys')
      .insert([
        {
          user_id: userId,
          identity_key: identityKey,
          signed_pre_key: signedPreKey,
        },
      ]);

    if (error) {
      console.error('❌ Failed to upload keys:', error.message);
      throw error;
    }

    console.log('✅ Keys uploaded successfully for', userId);
  } catch (err: any) {
    console.error('❌ Upload failed due to exception:', err?.message || err);
    throw err;
  }
}
