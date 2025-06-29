// utils/identity.ts
import * as ed from '@noble/ed25519';
import { randomBytes } from '@noble/hashes/utils';
import base64js from 'base64-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function generateIdentityKeys() {
  const secretKey = randomBytes(32);
  const publicKey = await ed.getPublicKey(secretKey);
  return {
    private: base64js.fromByteArray(secretKey),
    public: base64js.fromByteArray(publicKey),
  };
  
}

const identity = await generateIdentityKeys();
await AsyncStorage.setItem('identity_private_key', identity.private);
