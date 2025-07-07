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
  console.log('🧠 getOrCreateChatKeys() called with:', userId);
  const stored = await AsyncStorage.getItem(KEYPAIR_STORAGE_KEY);

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      console.log('📦 Found stored keys in AsyncStorage');
      return {
        publicKey: util.decodeBase64(parsed.publicKey),
        secretKey: util.decodeBase64(parsed.secretKey),
      };
    } catch (e) {
      console.error('⚠️ Failed to parse stored key:', e);
    }
  }

  console.log('🔐 No stored key found — generating new one...');
  const kp = nacl.box.keyPair();
  const publicKey = util.encodeBase64(kp.publicKey);
  const secretKey = util.encodeBase64(kp.secretKey);

  await AsyncStorage.setItem(
    KEYPAIR_STORAGE_KEY,
    JSON.stringify({ publicKey, secretKey })
  );

  console.log('✅ Stored new key in AsyncStorage');
  console.log('📤 Calling uploadUserKey()...');
  await uploadUserKey(userId, publicKey);
  console.log('✅ uploadUserKey() call completed');

  console.log('🚀 Uploaded public key to Supabase');
  return kp;
}

