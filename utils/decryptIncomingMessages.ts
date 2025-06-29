import { decryptMessage } from './decryptMessage';
import { deriveSharedSecret } from './deriveSharedSecret';
import { getMyPrivateKey } from './getMyPrivateKey';

export async function decryptMessages(messages: any[], theirPublicKey: string) {
  const myPrivate = await getMyPrivateKey();
  const sharedSecret = await deriveSharedSecret(theirPublicKey, myPrivate);

  const decrypted = await Promise.all(
    messages.map(async (msg) => {
      const { ciphertext, nonce } = JSON.parse(msg.text);
      const plaintext = await decryptMessage(ciphertext, nonce, sharedSecret);
      return { ...msg, plaintext };
    })
  );

  return decrypted;
}
