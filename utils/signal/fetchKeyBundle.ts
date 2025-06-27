import { supabase } from '../../lib/supabase';

export async function fetchKeyBundleForUser(recipientId: string) {
  const { data, error } = await supabase
    .from('signal_key_bundles')
    .select('*')
    .eq('user_id', recipientId)
    .single();

  if (error || !data) {
    console.error("❌ Failed to fetch key bundle:", error);
    return null;
  }

  return {
    identityKey: base64ToArrayBuffer(data.identity_key),
    registrationId: data.registration_id,
    signedPreKey: {
      keyId: data.signed_prekey.keyId,
      publicKey: base64ToArrayBuffer(data.signed_prekey.publicKey),
      signature: base64ToArrayBuffer(data.signed_prekey.signature),
    },
    preKey: {
      keyId: data.prekeys[0].keyId,
      publicKey: base64ToArrayBuffer(data.prekeys[0].publicKey)
    }
  };
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
