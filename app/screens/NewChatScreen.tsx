import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

interface Profile {
  id: string;
  username: string | null;
  name: string | null;
  image_url: string | null;
}

export default function NewChatScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth()!;
  const insets = useSafeAreaInsets();
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!user) return;
      console.log('NewChatScreen user effect', user.id);
      console.log('Load follows for user', user.id);
      const { data: follows, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      if (error) {
        console.error('Failed to fetch follow list', error);
        return;
      }
      console.log('Follow IDs', follows?.map((f: any) => f.following_id));
      const ids = (follows ?? []).map((f: any) => f.following_id);
      if (ids.length === 0) {
        if (isMounted) setAllUsers([]);
        return;
      }
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, name, image_url')
        .in('id', ids);
      if (profileError) {
        console.error('Failed to fetch users', profileError);
        return;
      }
      console.log('Loaded profiles', profiles?.map((p) => p.id));
      if (isMounted)
        setAllUsers((profiles ?? []).filter((p) => p.id !== user.id) as Profile[]);

    };
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      const q = search.trim();
      if (q === '') {
        if (isMounted) setSearchResults([]);
        return;
      }
      console.log('Searching profiles for', q);
      const like = `%${q}%`;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, name, image_url')
        .or(`username.ilike.${like},name.ilike.${like}`)
        .limit(20);
      if (error) {
        console.error('Failed to search profiles', error);
        if (isMounted) setSearchResults([]);
        return;
      }
      if (isMounted) {
        const results = (data ?? []).filter((p) => p.id !== user?.id) as Profile[];
        console.log('Search results for', q, results.map((p) => p.id));
        setSearchResults(results);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [search, user]);

  const filtered = search.trim() === '' ? allUsers : searchResults;

  const startChat = async (targetId: string) => {
    if (!user) return;
    console.log('startChat current user', user.id, 'target', targetId);
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${targetId}),and(participant_1.eq.${targetId},participant_2.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      console.log('Found existing conversation', existing.id, existing.participant_1, existing.participant_2);
    }

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
      console.log('Created conversation', created.id);
      convoId = created.id;
    }
    console.log('Navigating to DMThread', convoId);
    navigation.replace('DMThread', { conversationId: convoId, recipientId: targetId });
  };

  const renderItem = ({ item }: { item: Profile }) => (
    <TouchableOpacity style={styles.item} onPress={() => startChat(item.id)}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]} />
      )}
      <Text style={styles.name}>{item.name || item.username}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <TextInput
        style={styles.input}
        placeholder="Search users"
        placeholderTextColor={colors.muted}
        value={search}
        onChangeText={setSearch}
      />
      <FlatList data={filtered} keyExtractor={(i) => i.id} renderItem={renderItem} />
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
