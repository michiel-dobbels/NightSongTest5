import * as libsignal from '@privacyresearch/libsignal-protocol';
import SignalStore from '../utils/signal/SignalStore';
import { decryptMessageFrom } from '../utils/signal/decryptMessage';

export async function decryptSignalMessage(ciphertext: string, senderId: string) {
  const store = await SignalStore.initFromStorage();
  const decrypted = await decryptMessageFrom(senderId, { type: 1, body: ciphertext }, store);
  return decrypted;
}
