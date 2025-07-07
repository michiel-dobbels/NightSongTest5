import * as nacl from 'tweetnacl';
import * as util from 'tweetnacl-util';

export function encryptMessage(message: string, receiverPublicKey: Uint8Array, senderSecretKey: Uint8Array) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const msg = util.decodeUTF8(message);
  const box = nacl.box(msg, nonce, receiverPublicKey, senderSecretKey);
  return {
    nonce: util.encodeBase64(nonce),
    box: util.encodeBase64(box),
  };
}

export function decryptMessage(boxB64: string, nonceB64: string, senderPublicKey: Uint8Array, receiverSecretKey: Uint8Array) {
  const box = util.decodeBase64(boxB64);
  const nonce = util.decodeBase64(nonceB64);
  const msg = nacl.box.open(box, nonce, senderPublicKey, receiverSecretKey);
  if (!msg) throw new Error('Failed to decrypt');
  return util.encodeUTF8(msg);
}
