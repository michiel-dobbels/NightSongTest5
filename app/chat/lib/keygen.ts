import AsyncStorage from '@react-native-async-storage/async-storage';
import * as nacl from 'tweetnacl';
import * as util from 'tweetnacl-util';
import { supabase } from './supabase';

const STORAGE_KEY = 'e2ee_keypair';

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export async function getOrCreateKeys(): Promise<KeyPair> {
  console.log('[keygen] Checking for existing keypair');
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      console.log('[keygen] Loaded keypair from storage');
      return {
        publicKey: util.decodeBase64(parsed.publicKey),
        secretKey: util.decodeBase64(parsed.secretKey),
      };
    } catch (err) {
      console.log('[keygen] Failed to parse stored keypair', err);
    }
  }

  console.log('[keygen] Generating new keypair');
  const kp = nacl.box.keyPair();
  const publicKeyB64 = util.encodeBase64(kp.publicKey);
  const secretKeyB64 = util.encodeBase64(kp.secretKey);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ publicKey: publicKeyB64, secretKey: secretKeyB64 }));
  console.log('[keygen] Stored new keypair locally');

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (userId) {
      const { error } = await supabase
        .from('user_keys')
        .upsert({ user_id: userId, public_key: publicKeyB64 }, { onConflict: 'user_id' });
      if (error) {
        console.error('[keygen] Failed to upload public key', error);
      } else {
        console.log('[keygen] Uploaded public key for', userId);
      }
    } else {
      console.warn('[keygen] No authenticated user - skipping upload');
    }
  } catch (err) {
    console.error('[keygen] Error uploading public key', err);
  }

  return kp;
}
