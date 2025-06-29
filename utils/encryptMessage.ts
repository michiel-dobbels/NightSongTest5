import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/hashes/utils';
import base64js from 'base64-js';

// Encrypt with symmetric shared key (already derived or agreed upon via Signal)
export async function encryptMessage(plaintext: string, sharedSecretBase64: string) {
  const key = base64js.toByteArray(sharedSecretBase64); // Uint8Array (32 bytes)
  const nonce = randomBytes(24); // XChaCha20 requires 24-byte nonce
  const encoded = new TextEncoder().encode(plaintext); // convert to Uint8Array

  const ciphertext = xchacha20poly1305(key, nonce).encrypt(encoded);
  

  return {
    nonce: base64js.fromByteArray(nonce),
    ciphertext: base64js.fromByteArray(ciphertext),
  };
}
