// components/ReceiveMessages.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList } from 'react-native';
import { supabase } from '../lib/supabase';
import { fetchPublicKey } from '../utils/fetchPublicKey';
import { decryptMessages } from '../utils/decryptIncomingMessages';

type Props = {
  conversationId: string;
  otherUserId: string;
};

export default function ReceiveMessages({ conversationId, otherUserId }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const theirPublicKey = await fetchPublicKey(otherUserId);
      const decrypted = await decryptMessages(data || [], theirPublicKey);
      setMessages(decrypted);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  if (loading) return <ActivityIndicator />;

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 10 }}>
          <Text>{item.sender_id === otherUserId ? 'Them:' : 'You:'}</Text>
          <Text style={{ fontSize: 16 }}>{item.plaintext}</Text>
        </View>
      )}
    />
  );
}
