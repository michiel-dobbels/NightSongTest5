import { x25519 } from '@noble/curves/ed25519';
import base64js from 'base64-js';

export async function deriveSharedSecret(theirPublicKeyBase64: string, myPrivateKeyBase64: string) {
  const theirPublicKey = base64js.toByteArray(theirPublicKeyBase64); // Uint8Array
  const myPrivateKey = base64js.toByteArray(myPrivateKeyBase64);     // Uint8Array

  const sharedSecret = x25519.getSharedSecret(myPrivateKey, theirPublicKey); // ✅ this works

  return base64js.fromByteArray(sharedSecret);
}
