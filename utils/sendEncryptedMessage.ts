import { encryptMessage } from './encryptMessage';
import { deriveSharedSecret } from './deriveSharedSecret';
import { supabase } from '../lib/supabase';
import { getMyPrivateKey } from './getMyPrivateKey';

export async function sendEncryptedMessage({
  conversation_id,
  receiverPublicKey,
  myPrivateKey,
  messageText,
  sender_id,
}: {
  conversation_id: string;
  receiverPublicKey: string;
  myPrivateKey: string;
  messageText: string;
  sender_id: string;
}) {
  const sharedSecret = await deriveSharedSecret(receiverPublicKey, myPrivateKey);
  const { ciphertext, nonce } = await encryptMessage(messageText, sharedSecret);

  const { error } = await supabase.from('messages').insert({
    conversation_id,
    sender_id,
    text: JSON.stringify({ ciphertext, nonce }),
  });

  if (error) throw new Error('Send failed: ' + error.message);
}
