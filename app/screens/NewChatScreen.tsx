import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Image, StyleSheet } from 'react-native';
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
        .select('id, username, name, image_url')
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

  const filtered = allUsers.filter((u) => {
    const query = search.toLowerCase();
    return (
      u.username?.toLowerCase().includes(query) ||
      u.name?.toLowerCase().includes(query)
    );
  });

  const startChat = (profile: Profile) => {
    navigation.navigate('Chat', {
      id: profile.id,
      display_name: profile.name || profile.username,
      avatar_url: profile.image_url,
    });
  };

  const renderItem = ({ item }: { item: Profile }) => (
    <TouchableOpacity style={styles.item} onPress={() => startChat(item)}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]} />
      )}
      <Text style={styles.name}>{item.name || item.username}</Text>
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
