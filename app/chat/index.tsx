import React, { useEffect, useRef, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

interface Profile {
  id: string;
  username: string | null;
  name: string | null;
  image_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

export default function ChatScreen() {
  const { user } = useAuth()!;
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    let active = true;
    const load = async () => {
      const query = search.trim();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, name, image_url')
        .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(20);
      if (!active) return;
      if (error) {
        console.error('User search failed', error);
      } else {
        setResults((data ?? []) as Profile[]);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [search]);


  useEffect(() => {
    if (!conversationId) return;
    let isMounted = true;
    const load = async () => {
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
  }, [conversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      flatRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const startChat = async (target: Profile) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${target.id}),and(participant_1.eq.${target.id},participant_2.eq.${user.id})`)
      .maybeSingle();

    let convoId = existing?.id as string | undefined;
    if (!convoId) {
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ participant_1: user.id, participant_2: target.id })
        .select('id')
        .single();
      if (error) {
        console.error('Failed to create conversation', error);
        return;
      }
      convoId = created!.id;
    }
    setConversationId(convoId);
    setRecipient(target);
    setModalVisible(false);
    setSearch('');
    setResults([]);
  };

  const send = async () => {
    const body = text.trim();
    if (!body || !conversationId) return;
    setText('');
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user!.id, text: body })
      .select('*')
      .single();
    if (error) {
      console.error('Failed to send message', error);
    } else if (data) {
      setMessages((m) => [...m, data as Message]);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user!.id;
    return (
      <View style={[styles.messageRow, isMe ? styles.right : styles.left]}>
        {!isMe && (
          <Text style={styles.sender}>{recipient?.name || recipient?.username}</Text>
        )}
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  const renderResult = ({ item }: { item: Profile }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => startChat(item)}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]} />
      )}
      <Text style={styles.name}>{item.name || item.username}</Text>
    </TouchableOpacity>
  );

  const handleSend = () => {
    const body = text.trim();
    if (!body || !recipientId) return;
    onSend(body, String(recipientId));
    setText('');
  };

  const onSend = (message: string, toId: string) => {
    console.log('Send encrypted message', message, 'to', toId);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{recipient ? recipient.name || recipient.username : 'Messages'}</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>
      {conversationId ? (
        <>
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
          />
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Message"
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity onPress={send} style={styles.sendButton}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={{ padding: 16 }}>
          <TextInput
            style={styles.search}
            placeholder="Search users"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
          <FlatList data={results} keyExtractor={(i) => i.id} renderItem={renderResult} />
        </View>
      )}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <TextInput
            style={styles.search}
            placeholder="Search users"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
          <FlatList data={results} keyExtractor={(i) => i.id} renderItem={renderResult} />
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.muted,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  list: { padding: 12, paddingBottom: 80 },
  messageRow: { maxWidth: '80%', marginVertical: 4, padding: 8, borderRadius: 6 },
  left: { alignSelf: 'flex-start', backgroundColor: '#444' },
  right: { alignSelf: 'flex-end', backgroundColor: '#4caf50' },
  messageText: { color: colors.text },
  sender: { color: colors.muted, fontSize: 12, marginBottom: 2 },

  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
    borderRadius: 20,
    marginRight: 8,
  },
  sendButton: { backgroundColor: colors.accent, padding: 10, borderRadius: 20 },
  search: {
    backgroundColor: '#1f1f3d',
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  placeholder: { backgroundColor: colors.muted },
  name: { color: colors.text },
  modalContainer: { flex: 1, backgroundColor: colors.background, padding: 16 },
  closeButton: {
    marginTop: 12,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.accent,
    borderRadius: 6,
  },
  closeText: { color: colors.text },

});
