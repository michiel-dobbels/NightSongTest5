import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
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
  text: string;
  created_at: string;
}

interface Profile {
  id: string;
  username: string | null;
  name: string | null;
  image_url: string | null;
}

export default function DMThreadScreen() {
  const route = useRoute<any>();
  const { conversationId, recipientId } = route.params as { conversationId: string; recipientId: string };
  const { user } = useAuth()!;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, name, image_url')
        .eq('id', recipientId)
        .single();
      if (isMounted) setProfile(data as Profile);

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at');
      if (isMounted) setMessages((msgs ?? []) as Message[]);

    };
    load();

    const subscription = supabase
      .from(`messages:conversation_id=eq.${conversationId}`)
      .on('INSERT', (payload) => {
        setMessages((m) => [...m, payload.new as Message]);
      })

      .subscribe();

    return () => {
      isMounted = false;
      subscription.unsubscribe();

    };
  }, [conversationId, recipientId]);

  useEffect(() => {
    if (messages.length > 0) {
      flatRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user!.id,
        text: body,
      })
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
    const isMe = item.sender_id === user!.id;
    const senderName = profile?.name || profile?.username || 'Unknown';
    return (
      <View style={[styles.messageRow, isMe ? styles.right : styles.left]}>
        {!isMe && <Text style={styles.sender}>{senderName}</Text>}

        <Text style={styles.messageText}>{item.text}</Text>
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
        {profile?.image_url ? (
          <Image source={{ uri: profile.image_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]} />
        )}
        <Text style={styles.name}>{profile?.name || profile?.username}</Text>
      </View>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        }

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
          <Text style={{ color: colors.text }}>Send</Text>
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
  right: { alignSelf: 'flex-end', backgroundColor: '#4caf50' },
  messageText: { color: colors.text },
  sender: { color: colors.muted, fontSize: 12, marginBottom: 2 },

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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  emptyText: { color: colors.muted },

});
