import { supabase } from '../../lib/supabase';

export async function uploadKeyBundle(userId: string, publicBundle: any) {
  const { error } = await supabase
    .from('signal_key_bundles')
    .upsert({
      user_id: userId,
      identity_key: publicBundle.identityKey,
      registration_id: publicBundle.registrationId,
      signed_prekey: publicBundle.signedPreKey,
      prekeys: publicBundle.preKeys
    });

  if (error) {
    console.error('❌ Failed to upload Signal keys:', error);
  } else {
    console.log('✅ Signal keys uploaded to Supabase.');
  }
}
