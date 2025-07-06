import AsyncStorage from '@react-native-async-storage/async-storage';
import * as nacl from 'tweetnacl';
import * as util from 'tweetnacl-util';
import { uploadUserKey } from './supabase/userKeys';

export const KEYPAIR_STORAGE_KEY = 'e2ee_keypair';

export interface ChatKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export async function getOrCreateChatKeys(userId: string): Promise<ChatKeyPair> {
  const stored = await AsyncStorage.getItem(KEYPAIR_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        publicKey: util.decodeBase64(parsed.publicKey),
        secretKey: util.decodeBase64(parsed.secretKey),
      };
    } catch (e) {
      // fall through to regenerate keys
    }
  }

  const kp = nacl.box.keyPair();
  await AsyncStorage.setItem(
    KEYPAIR_STORAGE_KEY,
    JSON.stringify({
      publicKey: util.encodeBase64(kp.publicKey),
      secretKey: util.encodeBase64(kp.secretKey),
    })
  );
  await uploadUserKey(userId, util.encodeBase64(kp.publicKey));
  console.log(
    'Generated E2EE keys:',
    util.encodeBase64(kp.publicKey),
    util.encodeBase64(kp.secretKey)
  );
  return kp;
}
