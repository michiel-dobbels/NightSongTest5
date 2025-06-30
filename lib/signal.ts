import * as SecureStore from 'expo-secure-store';
import { KeyHelper } from 'libsignal-protocol';
import { supabase } from './supabase';

const IDENTITY_KEY = 'signal_identity_key';
const REGISTRATION_ID = 'signal_registration_id';

export interface SignalIdentity {
  identityKey: string;
  registrationId: number;
}

export async function getOrCreateIdentity(): Promise<SignalIdentity> {
  let encoded = await SecureStore.getItemAsync(IDENTITY_KEY);
  let reg = await SecureStore.getItemAsync(REGISTRATION_ID);

  if (!encoded || !reg) {
    const identity = await KeyHelper.generateIdentityKeyPair();
    const registrationId = KeyHelper.generateRegistrationId();

    const pub = Buffer.from(identity.pubKey).toString('base64');
    const priv = Buffer.from(identity.privKey).toString('base64');
    encoded = JSON.stringify({ pub, priv });
    reg = registrationId.toString();

    await SecureStore.setItemAsync(IDENTITY_KEY, encoded);
    await SecureStore.setItemAsync(REGISTRATION_ID, reg);

    const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : supabase.auth.user();
    if (user) {
      await supabase
        .from('signal_identities')
        .upsert({
          user_id: user.id,
          identity_key: pub,
          registration_id: registrationId,
        }, { onConflict: 'user_id' });
    }
  }

  const parsed = JSON.parse(encoded);
  return { identityKey: parsed.pub, registrationId: parseInt(reg, 10) };
}
