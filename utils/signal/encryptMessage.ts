import * as libsignal from '@privacyresearch/libsignal-protocol-typescript';

export async function encryptMessageTo(recipientId: string, plaintext: string, signalStore: any) {
  const address = new libsignal.SignalProtocolAddress(recipientId, 1);
  const cipher = new libsignal.SessionCipher(signalStore, address);

  const ciphertext = await cipher.encrypt(plaintext);

  // ciphertext can be either PreKeySignalMessage or SignalMessage
  return {
    type: ciphertext.type,
    body: arrayBufferToBase64(ciphertext.body)
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
