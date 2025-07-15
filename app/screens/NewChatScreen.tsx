import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  image_url: string | null;
}

export default function NewChatScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth()!;
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!user) return;
      const { data: follows, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      if (error) {
        console.error('Failed to fetch follow list', error);
        return;
      }
      const ids = (follows ?? []).map((f: any) => f.following_id);
      if (ids.length === 0) {
        if (isMounted) setAllUsers([]);
        return;
      }
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, image_url')
        .in('id', ids);
      if (profileError) {
        console.error('Failed to fetch users', profileError);
        return;
      }
      if (isMounted)
        setAllUsers((profiles ?? []).filter((p) => p.id !== user.id) as Profile[]);

    };
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const [searchResults, setSearchResults] = useState<Profile[]>([]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      const q = search.trim();
      if (q === '') {
        setSearchResults([]);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, image_url')
        .ilike('display_name', `%${q}%`)
        .limit(20);
      if (error) {
        console.error('Failed to search profiles', error);
        return;
      }
      if (isMounted) {
        setSearchResults(
          ((data ?? []) as Profile[]).filter(p => p.id !== user?.id),
        );
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [search, user]);

  const startChat = async (targetId: string) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
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
    navigation.replace('DMThread', { conversationId: convoId, recipientId: targetId });
  };

  const renderItem = ({ item }: { item: Profile }) => (
    <TouchableOpacity style={styles.item} onPress={() => startChat(item.id)}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]} />
      )}
      <Text style={styles.name}>{item.display_name || item.username}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search users"
        placeholderTextColor={colors.muted}
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={search.trim() ? searchResults : allUsers}
        keyExtractor={i => i.id}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  input: {
    backgroundColor: '#1f1f3d',
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  placeholder: { backgroundColor: colors.muted },
  name: { color: colors.text },
});
