import 'react-native-get-random-values';
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
  
  let kp;
  try {
    kp = nacl.box.keyPair();
    console.log('🛠️ Successfully generated keypair');
  } catch (e) {
    console.error('💥 Failed to generate keypair:', e);
    throw new Error('Key generation failed');
  }

  const publicKey = util.encodeBase64(kp.publicKey);
  const secretKey = util.encodeBase64(kp.secretKey);
  console.log('🔑 Encoded publicKey:', publicKey.slice(0, 20), '...'); // log first 20 chars only
  console.log('🔑 Encoded secretKey:', secretKey.slice(0, 20), '...');

  try {
    await AsyncStorage.setItem(
      KEYPAIR_STORAGE_KEY,
      JSON.stringify({ publicKey, secretKey })
    );
    console.log('✅ Stored new key in AsyncStorage');
  } catch (e) {
    console.error('❌ Failed to store key in AsyncStorage:', e);
    throw new Error('Failed to persist keys');
  }

  try {
    console.log('📤 Calling uploadUserKey()...');
    await uploadUserKey(userId, publicKey);
    console.log('✅ uploadUserKey() call completed');
  } catch (e) {
    console.error('❌ uploadUserKey() threw:', e);
  }

  console.log('📦 Returning keypair from getOrCreateChatKeys()');
  return kp;
}

