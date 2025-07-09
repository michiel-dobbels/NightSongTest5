import 'react-native-get-random-values';

import * as nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';

export interface EncryptMessageOptions {
  plaintext: string;
  senderSecretKey: Uint8Array;
  recipientPublicKey: Uint8Array;
}

export interface EncryptedMessage {
  ciphertext: string;
  nonce: string;
}

/**
 * Encrypt a plaintext message using NaCl box.
 *
 * @param options Object containing plaintext, senderSecretKey and recipientPublicKey.
 * @returns Base64 encoded ciphertext and nonce.
 */
export function encryptMessage(options: EncryptMessageOptions): EncryptedMessage {
  const { plaintext, senderSecretKey, recipientPublicKey } = options;

  // Generate a random nonce
  const nonce = nacl.randomBytes(24);

  // Encode the plaintext
  const messageUint8 = naclUtil.decodeUTF8(plaintext);

  // Encrypt the message
  const encrypted = nacl.box(messageUint8, nonce, recipientPublicKey, senderSecretKey);

  // Encode ciphertext and nonce to base64
  const ciphertext = naclUtil.encodeBase64(encrypted);
  const nonceB64 = naclUtil.encodeBase64(nonce);

  return { ciphertext, nonce: nonceB64 };

}

