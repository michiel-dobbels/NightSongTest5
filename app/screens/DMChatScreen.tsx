import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  ciphertext: string;
  nonce?: string;
  created_at: string;
}

interface User {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
}

const DMChatScreen = ({ route }: { route: { params: { otherUserId: string; otherUser: User } } }) => {
  const { otherUserId, otherUser } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');

  useEffect(() => {
    const user = supabase.auth.user();
    if (!user) return;
    fetchMessages(user.id);

    const subscription = supabase
      .from('messages')
      .on('INSERT', (payload) => {
        const newMsg = payload.new as Message;
        if (
          (newMsg.sender_id === user.id && newMsg.recipient_id === otherUserId) ||
          (newMsg.sender_id === otherUserId && newMsg.recipient_id === user.id)
        ) {
          setMessages((prev) => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [otherUserId]);

  const fetchMessages = async (currentUserId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}`)
      .or(`sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId}`)
      .order('created_at', { ascending: true });

    if (error) console.error(error);
    else setMessages(data as Message[]);
  };

  const sendMessage = async () => {
    if (!newMessage) return;
    const user = supabase.auth.user();
    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: otherUserId,
        ciphertext: newMessage,
        nonce: 'your_nonce',
      });

    if (error) console.error(error);
    else setNewMessage('');
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const user = supabase.auth.user();
    const currentUserId = user ? user.id : '';
    return (
      <Text style={item.sender_id === currentUserId ? styles.myMessage : styles.theirMessage}>
        {item.ciphertext}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <Text>Chat with {otherUser.username || 'User'}</Text>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
      />
      <TextInput
        style={styles.input}
        value={newMessage}
        onChangeText={setNewMessage}
        placeholder="Type message..."
      />
      <Button title="Send" onPress={sendMessage} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#dcf8c6', padding: 10, margin: 5 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#fff', padding: 10, margin: 5 },
  input: { borderWidth: 1, padding: 10, marginTop: 10 },
});

export default DMChatScreen;