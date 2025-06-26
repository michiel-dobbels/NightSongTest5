import * as libsignal from '@privacyresearch/libsignal-protocol-typescript';

export async function decryptMessageFrom(
  senderId: string,
  encrypted: { type: number, body: string },
  signalStore: any
): Promise<string> {
  const address = new libsignal.SignalProtocolAddress(senderId, 1);
  const cipher = new libsignal.SessionCipher(signalStore, address);

  const ciphertextBytes = base64ToArrayBuffer(encrypted.body);

  let plaintextBytes;
  if (encrypted.type === 3) {
    // PreKeySignalMessage (first message in session)
    plaintextBytes = await cipher.decryptPreKeyWhisperMessage(ciphertextBytes, 'binary');
  } else if (encrypted.type === 1) {
    // SignalMessage (normal session message)
    plaintextBytes = await cipher.decryptWhisperMessage(ciphertextBytes, 'binary');
  } else {
    throw new Error("Unknown message type: " + encrypted.type);
  }

  const plaintext = new TextDecoder().decode(plaintextBytes);
  return plaintext;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
