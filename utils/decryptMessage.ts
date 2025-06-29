// utils/decryptMessage.ts
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import base64js from 'base64-js';

export async function decryptMessage(ciphertextB64: string, nonceB64: string, sharedSecretB64: string) {
  const key = base64js.toByteArray(sharedSecretB64);
  const nonce = base64js.toByteArray(nonceB64);
  const ciphertext = base64js.toByteArray(ciphertextB64);

  
  const decrypted = xchacha20poly1305(key, nonce).decrypt(ciphertext);

  if (!decrypted) throw new Error("Decryption failed");

  return new TextDecoder().decode(decrypted);
}
