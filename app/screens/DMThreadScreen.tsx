import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

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
      if (isMounted) setMessages(msgs as Message[]);
    };
    load();

    const channel = supabase
      .channel('dm-' + conversationId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((m) => [...m, payload.new as Message]);
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, recipientId]);

  useEffect(() => {
    if (messages.length > 0) {
      flatRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user!.id,
      text,
    });
    setText('');
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user!.id;
    return (
      <View style={[styles.messageRow, isMe ? styles.right : styles.left]}>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
  list: { padding: 12 },
  messageRow: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 8,
    borderRadius: 6,
  },
  left: { alignSelf: 'flex-start', backgroundColor: '#444' },
  right: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  messageText: { color: colors.text },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.muted,
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
});
