import { generateIdentityKeyPair, generatePreKeyBundle } from '@privacyresearch/libsignal-protocol';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';

export async function initializeKeys(user_id: string) {
  const { data: existing } = await supabase
    .from('signal_key_bundles')
    .select('user_id')
    .eq('user_id', user_id)
    .maybeSingle();

  if (existing) return; // keys already uploaded

  const identityKeyPair = await generateIdentityKeyPair();
  const bundle = await generatePreKeyBundle(identityKeyPair);

  await SecureStore.setItemAsync('identityKey', JSON.stringify(identityKeyPair));
  await SecureStore.setItemAsync('signedPreKey', JSON.stringify(bundle));

  await supabase.from('signal_key_bundles').upsert({
    user_id,
    identity_key: JSON.stringify(identityKeyPair.publicKey),
    registration_id: bundle.registrationId,
    signed_prekey: JSON.stringify(bundle.signedPreKey),
    prekeys: JSON.stringify(bundle.preKeys),
  });
}

export async function getStoredIdentity() {
  const val = await SecureStore.getItemAsync('identityKey');
  return val ? JSON.parse(val) : null;
}

export async function getStoredSignedPreKey() {
  const val = await SecureStore.getItemAsync('signedPreKey');
  return val ? JSON.parse(val) : null;
}
