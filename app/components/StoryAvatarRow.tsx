import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { supabase } from '../../lib/supabase';
import { useStories } from '../contexts/StoryContext';

export default function StoryAvatarRow() {
  const navigation = useNavigation<any>();
  const { profileImageUri, user } = useAuth()!;
  const { openUserStories } = useStories();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followError) {
        console.error('Failed to fetch following list', followError);
        return;
      }

      const ids = (followData ?? []).map(f => f.following_id);
      ids.push(user.id);

      if (ids.length === 0) {
        setUsers([]);
        return;
      }

      const { data, error } = await supabase
        .from('stories')
        .select('user_id, profiles(username, name, image_url)')
        .in('user_id', ids)
        .gt('expires_at', new Date().toISOString());

      if (!error && data) {
        const seen = new Set();
        const arr: any[] = [];
        data.forEach((s: any) => {
          if (!seen.has(s.user_id)) {
            arr.push(s);
            seen.add(s.user_id);
          }
        });
        setUsers(arr);
      } else if (error) {
        console.error('Failed to fetch stories', error);
      }
    };
    load();
  }, [user?.id]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={{ paddingHorizontal: 10 }}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate('CreateStory')}
        style={styles.item}
      >
        {profileImageUri ? (
          <Image source={{ uri: profileImageUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]} />
        )}
      </TouchableOpacity>
      {users.map(u => (
        <TouchableOpacity
          key={u.user_id}
          onPress={() => openUserStories(u.user_id)}
          style={styles.item}
        >
          {u.profiles?.image_url ? (
            <Image
              source={{ uri: u.profiles.image_url }}
              style={[styles.avatar, styles.ring]}
            />
          ) : (
            <View style={[styles.avatar, styles.placeholder]} />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginTop: 10 },
  item: { marginRight: 10 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  ring: { borderWidth: 2, borderColor: '#0a84ff' },
  placeholder: { backgroundColor: '#555' },
});
