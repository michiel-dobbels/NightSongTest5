import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import debounce from 'lodash/debounce';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

interface Profile {
  id: string;
  username: string | null;
  name: string | null;
  image_url: string | null;

}

interface ConversationItem {
  id: string;
  participant_1: string;
  participant_2: string;
  otherUser?: Profile;
  lastMessage?: { text: string; created_at: string } | null;
}

export default function DMListScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth()!;
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('NewChat')}
          style={{ paddingHorizontal: 12 }}>
          <Ionicons name="add" size={24} color={colors.accent} />
        </TouchableOpacity>
      ),
      title: 'Direct Messages',
    });
  }, [navigation]);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('id, participant_1, participant_2')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);
    if (error) {
      console.error('Failed to load conversations', error);
      setConversations([]);
      setLoading(false);
      return;
    }
    const convos = (data ?? []) as ConversationItem[];
    const otherIds = convos.map((c) =>
      c.participant_1 === user.id ? c.participant_2 : c.participant_1,
    );
    if (otherIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, name, image_url')
        .in('id', otherIds);
      const profileMap = new Map(
        (profiles ?? []).map((p: any) => [p.id, p as Profile]),
      );

      // Fetch last messages for conversations
      const { data: msgs } = await supabase
        .from('messages')
        .select('conversation_id,text,created_at')
        .in('conversation_id', convos.map((c) => c.id))
        .order('created_at', { ascending: false });
      const lastMap: Record<string, { text: string; created_at: string }> = {};
      (msgs ?? []).forEach((m: any) => {
        if (!lastMap[m.conversation_id]) {
          lastMap[m.conversation_id] = {
            text: m.text,
            created_at: m.created_at,
          };
        }
      });

      const formatted = convos
        .map((c) => ({
          ...c,
          otherUser: profileMap.get(
            c.participant_1 === user.id ? c.participant_2 : c.participant_1,
          ),
          lastMessage: lastMap[c.id] || null,
        }))
        .sort((a, b) => {
          const ta = a.lastMessage?.created_at || 0;
          const tb = b.lastMessage?.created_at || 0;
          return new Date(tb).getTime() - new Date(ta).getTime();
        });
      setConversations(formatted);
    } else {
      setConversations([]);
    }
    setLoading(false);
  };

  const searchUsers = async (query: string) => {
    if (!query) {
      setResults([]);
      return;
    }
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, name, image_url')
      .ilike('name', `%${query}%`)
      .neq('id', user.id);
    if (error) {
      console.error('Error searching users', error);
      return;

    }
    setResults(data as Profile[]);
  };
  const debounced = debounce(searchUsers, 300);

  const openConversation = async (targetId: string) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${targetId}),and(participant_1.eq.${targetId},participant_2.eq.${user.id})`)
      .maybeSingle();
    let convoId = existing?.id;
    if (!convoId) {
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ participant_1: user.id, participant_2: targetId })
        .select('id')
        .single();
      if (error) {
        console.error('Failed to create conversation', error);
        return;
      }
      convoId = created.id;
    }
    navigation.navigate('DMThread', {
      conversationId: convoId,
      recipientId: targetId,
    });
    setSearch('');
    setResults([]);
  };

  const renderUserItem = ({ item }: { item: Profile }) => (
    <TouchableOpacity style={styles.item} onPress={() => openConversation(item.id)}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]} />
      )}
      <Text style={styles.name}>{item.name || item.username}</Text>
    </TouchableOpacity>
  );

  const renderConversationItem = ({ item }: { item: ConversationItem }) => (
    <TouchableOpacity style={styles.item} onPress={() => openConversation(item.otherUser!.id)}>
      {item.otherUser?.image_url ? (
        <Image source={{ uri: item.otherUser.image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.otherUser?.name || item.otherUser?.username}</Text>
        {item.lastMessage && (
          <Text style={styles.preview} numberOfLines={1}>
            {item.lastMessage.text}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );


  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search users"
        placeholderTextColor={colors.muted}
        value={search}
        onChangeText={(t) => {
          setSearch(t);
          debounced(t);
        }}
      />
      {loading ? (
        <Text style={styles.name}>Loading...</Text>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(i) => i.id}
          renderItem={renderUserItem}
          ListHeaderComponent={<Text style={styles.header}>Search Results</Text>}
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(i) => i.id}
          renderItem={renderConversationItem}
          ListEmptyComponent={<Text style={styles.name}>No conversations</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 10 },
  searchBar: {
    height: 40,
    borderColor: colors.muted,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 10,
    color: colors.text,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.muted,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  placeholder: { backgroundColor: colors.muted },
  name: { color: colors.text },
  preview: { color: colors.muted, fontSize: 12 },
  header: { color: colors.text, marginBottom: 6 },
});

