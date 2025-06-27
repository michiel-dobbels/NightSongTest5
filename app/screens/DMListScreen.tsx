import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { decryptSignalMessage } from '../../signal/decryption';
import { colors } from '../styles/colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BOTTOM_NAV_HEIGHT = SCREEN_HEIGHT * 0.1;
const FAB_BOTTOM_OFFSET = (BOTTOM_NAV_HEIGHT + 10) * 0.75;


interface Profile {
  id: string;
  username: string | null;
  name: string | null;
  image_url: string | null;
}

interface ConversationItem {
  id: string;
  other: Profile;
  lastMessage: { ciphertext: string; created_at: string; decryptedText?: string } | null;
}

export default function DMListScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth()!;
  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('conversations')
        .select('id, participant_1, participant_2')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to fetch conversations', error);
        return;
      }
      const convs: ConversationItem[] = [];
      for (const c of data ?? []) {
        const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, name, image_url')
          .eq('id', otherId)
          .single();
        const { data: msg } = await supabase
          .from('messages')
          .select('ciphertext, created_at')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        let lastMessage = null;
        if (msg) {
          const decryptedText = await decryptSignalMessage(msg.ciphertext, otherId);
          lastMessage = { ...msg, decryptedText };
        }
        if (profile)
          convs.push({ id: c.id, other: profile as Profile, lastMessage });
      }
      if (isMounted) setConversations(convs);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const renderItem = ({ item }: { item: ConversationItem }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() =>
        navigation.navigate('DMThread', {
          conversationId: item.id,
          recipientId: item.other.id,
        })
      }
    >
      {item.other.image_url ? (
        <Image source={{ uri: item.other.image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]} />
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{item.other.name || item.other.username}</Text>
        {item.lastMessage && (
          <Text style={styles.snippet} numberOfLines={1}>
            {item.lastMessage.decryptedText}
          </Text>
        )}
      </View>
      {item.lastMessage && (
        <Text style={styles.time}>{new Date(item.lastMessage.created_at).toLocaleTimeString()}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Direct Messages</Text>

      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewChat')}
      >
        <Text style={{ color: colors.text, fontSize: 24 }}>+</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',

    alignItems: 'center',
    marginBottom: 16,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.muted,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  placeholder: { backgroundColor: colors.muted },
  info: { flex: 1 },
  name: { color: colors.text, fontSize: 16 },
  snippet: { color: colors.muted, marginTop: 2 },
  time: { color: colors.muted, fontSize: 12 },
  fab: {
    position: 'absolute',
    bottom: FAB_BOTTOM_OFFSET,
    right: 20,
    backgroundColor: colors.accent,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },

});
