import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

interface FollowingListScreenProps {
  userId: string;
}

interface Profile {
  id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
}

export default function FollowingListScreen({ userId }: FollowingListScreenProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchFollowing = async () => {
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followError) {
        console.error('Failed to fetch following list', followError);
        return;
      }

      const ids = (followData ?? []).map(f => f.following_id);
      if (ids.length === 0) {
        if (isMounted) setProfiles([]);
        return;
      }

      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, name, image_url')
        .in('id', ids);

      if (profileError?.code === '42703') {
        const retry = await supabase
          .from('profiles')
          .select('id, username, display_name:name, avatar_url')
          .in('id', ids);
        profileData = retry.data as any;
        profileError = retry.error;
      }

      if (profileError) {
        console.error('Failed to fetch profiles', profileError);
        return;
      }

      if (isMounted && profileData) {
        const formatted = profileData.map(p => ({
          id: p.id,
          username: p.username,
          name:
            (p as any).name ??
            (p as any).display_name ??
            (p as any).full_name ??
            null,
          avatar_url: (p as any).image_url ?? (p as any).avatar_url ?? null,
        }));
        setProfiles(formatted);
      }
    };

    fetchFollowing();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const renderItem = ({ item }: { item: Profile }) => (
    <View style={styles.row}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]} />
      )}
      <View>
        {item.name && <Text style={styles.fullName}>{item.name}</Text>}
        {item.username && (
          <Text style={styles.username}>@{item.username}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={profiles}
        keyExtractor={item => item.id}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  placeholder: {
    backgroundColor: '#555',
  },
  fullName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    color: 'white',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2,
  },
});
