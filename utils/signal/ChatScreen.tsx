import React, { useEffect, useState } from 'react';
import { FlatList, Text, TextInput, View, Button } from 'react-native';
import { supabase } from '../../lib/supabase';
import * as libsignal from '@privacyresearch/libsignal-protocol-typescript';
import { useSignal } from '../../utils/signal/SignalContext';
import { useAuth } from '../../AuthContext';
import { RouteProp } from '@react-navigation/native';

type Message = {
  id: number;
  sender_id: string;
  recipient_id: string;
  decryptedText: string;
  timestamp: string;
};

type RootStackParamList = {
  Chat: { recipientId: string };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

const ChatScreen = ({ route }: { route: ChatScreenRouteProp }) => {

  const { recipientId } = route.params;
  const signalStore = useSignal();
  const auth = useAuth();

  if (!auth || !auth.user) {
    return <Text>Loading user info...</Text>;
  }

  const { user } = auth;
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');

  let subscription: any;

  const loadAndDecrypt = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${recipientId},recipient_id.eq.${recipientId}`)
      .order('timestamp');

    if (error) return console.error('❌ Supabase fetch error:', error);

    const address = new libsignal.SignalProtocolAddress(recipientId, 1);
    const cipher = new libsignal.SessionCipher(signalStore, address);

    const decrypted = await Promise.all(
      data.map(async (msg) => {
        try {
          const ciphertext = base64ToArrayBuffer(msg.body);
          let plaintextBytes;

          if (msg.type === 3) {
            plaintextBytes = await cipher.decryptPreKeyWhisperMessage(ciphertext, 'binary');
          } else {
            plaintextBytes = await cipher.decryptWhisperMessage(ciphertext, 'binary');
          }

          return {
            ...msg,
            decryptedText: new TextDecoder().decode(plaintextBytes),
          };
        } catch (e) {
          console.warn('⚠️ Failed to decrypt message:', e);
          return { ...msg, decryptedText: '[Failed to decrypt]' };
        }
      })
    );

    setMessages(decrypted);
  };

  useEffect(() => {
    subscription = supabase
      .channel('encrypted-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => loadAndDecrypt()
      )
      .subscribe();

    loadAndDecrypt();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [recipientId]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const address = new libsignal.SignalProtocolAddress(recipientId, 1);
    const cipher = new libsignal.SessionCipher(signalStore, address);

    const plaintextBytes = new Uint8Array(new TextEncoder().encode(messageText)).buffer as ArrayBuffer;
    const ciphertext = (await cipher.encrypt(plaintextBytes)) as unknown as {
      type: number;
      body: ArrayBuffer;
    };

    if (!ciphertext.body) {
      console.error('❌ Encryption failed — no ciphertext body returned.');
      return;
    }

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: recipientId,
      body: arrayBufferToBase64(ciphertext.body),
      type: ciphertext.type,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('❌ Failed to send message:', error);
    } else {
      setMessageText('');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender_id: user.id,
          recipient_id: recipientId, // ✅ now correctly referenced
          decryptedText: messageText,
          timestamp: new Date().toISOString(),
        },
      ]);

    }
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf: item.sender_id === recipientId ? 'flex-start' : 'flex-end',
              backgroundColor: item.sender_id === recipientId ? '#eee' : '#4e8cff',
              padding: 10,
              borderRadius: 12,
              marginVertical: 4,
              maxWidth: '75%',
            }}
          >
            <Text style={{ color: item.sender_id === recipientId ? '#000' : '#fff' }}>
              {item.decryptedText}
            </Text>
          </View>
        )}
      />

      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        <TextInput
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 10,
            marginRight: 8,
          }}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type your message"
        />
        <Button title="Send" onPress={handleSendMessage} />
      </View>
    </View>
  );
};

export default ChatScreen;
