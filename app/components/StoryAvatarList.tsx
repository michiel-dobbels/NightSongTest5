import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useAuth } from '../../AuthContext';
import { supabase } from '../../lib/supabase';
import { useStories } from '../contexts/StoryContext';

interface UserItem {
  user_id: string;
  profiles: {
    username: string | null;
    name: string | null;
    image_url: string | null;
  } | null;
}

export default function StoryAvatarList() {
  const { profileImageUri, profile } = useAuth()!;
  const { openUserStories } = useStories();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [hasMyStory, setHasMyStory] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('stories')
        .select('user_id, profiles(username, name, image_url)')
        .gt('expires_at', new Date().toISOString());
      if (data) {
        const seen = new Set<string>();
        const arr: UserItem[] = [];
        let mine = false;
        data.forEach((s: any) => {
          if (s.user_id === profile?.id) mine = true;
          if (!seen.has(s.user_id)) {
            arr.push(s);
            seen.add(s.user_id);
          }
        });
        setUsers(arr);
        setHasMyStory(mine);
      }
    };
    load();
  }, []);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={{ paddingHorizontal: 10 }}
    >
      <TouchableOpacity
        onPress={() => profile && openUserStories(profile.id)}
        style={styles.item}
      >
        {profileImageUri ? (
          <Image
            source={{ uri: profileImageUri }}
            style={[styles.avatar, hasMyStory && styles.ring]}
          />
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
