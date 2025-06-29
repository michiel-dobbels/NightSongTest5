import { fetchPublicKey } from '../utils/fetchPublicKey';
import { getMyPrivateKey } from '../utils/getMyPrivateKey';
import { sendEncryptedMessage } from '../utils/sendEncryptedMessage';
import { Button } from 'react-native';

type Props = {
  receiverId: string;
  conversation_id: string;
  myUserId: string;
  messageInput: string;
};

export function SendMessageButton({ receiverId, conversation_id, myUserId, messageInput }: Props) {

const send = async () => {
  const theirPublic = await fetchPublicKey(receiverId);
  const myPrivate = await getMyPrivateKey();

  await sendEncryptedMessage({
    conversation_id,
    sender_id: myUserId,
    messageText: messageInput,
    receiverPublicKey: theirPublic,
    myPrivateKey: myPrivate,
  });
};

  return (
    <Button title="Send" onPress={send} />
  );
}
