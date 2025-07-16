import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BOTTOM_NAV_HEIGHT = SCREEN_HEIGHT * 0.1;
const INPUT_BAR_HEIGHT = 56;

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface Params {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export default function ChatScreen() {
  const route = useRoute<any>();
  const { id: otherId, display_name, avatar_url } = route.params as Params;
  const { user } = useAuth()!;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMessages = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
        .order('created_at');
      if (error) console.error('Failed to fetch messages', error);
      if (isMounted) setMessages((data ?? []) as Message[]);
    };
    fetchMessages();

    const subscription = supabase
      .from('messages')
      .on('INSERT', (payload) => {
        const msg = payload.new as Message;
        if (
          (msg.sender_id === user?.id && msg.receiver_id === otherId) ||
          (msg.sender_id === otherId && msg.receiver_id === user?.id)
        ) {
          setMessages((m) => [...m, msg]);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeSubscription(subscription);
    };
  }, [user, otherId]);

  useEffect(() => {
    if (messages.length > 0) {
      flatRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || !user) return;
    setText('');
    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: user.id, receiver_id: otherId, content: body })
      .select()
      .single();
    if (error) {
      console.error('Failed to send message', error);
      return;
    }
    if (data) {
      setMessages((m) => [...m, data as Message]);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.messageRow, isMe ? styles.right : styles.left]}>
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString()}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={BOTTOM_NAV_HEIGHT}
    >
      <View style={styles.header}>
        {avatar_url ? (
          <Image source={{ uri: avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]} />
        )}
        <Text style={styles.name}>{display_name}</Text>
      </View>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor={colors.muted}
        />
        <TouchableOpacity onPress={send} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.muted,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  placeholder: { backgroundColor: colors.muted },
  name: { color: colors.text, fontSize: 16 },
  list: { padding: 12, paddingBottom: INPUT_BAR_HEIGHT + 12 },
  messageRow: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 8,
    borderRadius: 6,
  },
  left: { alignSelf: 'flex-start', backgroundColor: '#444' },
  right: { alignSelf: 'flex-end', backgroundColor: '#2a8fff' },
  messageText: { color: colors.text },
  time: { color: colors.muted, fontSize: 10, marginTop: 2 },
  inputRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BOTTOM_NAV_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.muted,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: '#1f1f3d',
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  sendButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.accent,
    borderRadius: 6,
  },
  sendButtonText: { color: colors.text },
});

