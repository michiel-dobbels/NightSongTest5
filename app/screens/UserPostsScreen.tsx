import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Button, Image, Text, Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';
import PostList from '../components/PostList';

import { Post } from '../types/Post';
import { useAuth } from '../../AuthContext';

interface Profile {
  id: string;
  username: string;
  name: string | null;
  image_url: string | null;
  banner_url: string | null;
}

export default function UserPostsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId } = route.params as { userId: string };
  const { user, profile } = useAuth() as any;
  const [posts, setPosts] = useState<Post[]>([]);
  const [profileInfo, setProfileInfo] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      let { data, error } = await supabase
        .from('profiles')
        .select('id, username, name, image_url, banner_url')
        .eq('id', userId)
        .single();

      if (error?.code === '42703') {
        const retry = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, banner_url')
          .eq('id', userId)
          .single();
        data = retry.data as any;
        error = retry.error;
      }

      if (!error && data) {
        setProfileInfo({
          id: data.id,
          username: data.username,
          name:
            (data as any).name ??
            (data as any).display_name ??
            (data as any).full_name ??
            null,
          image_url: (data as any).image_url ?? (data as any).avatar_url ?? null,
          banner_url: data.banner_url,
        });
      }
    };
    fetchProfile();
  }, [userId]);


  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id, content, image_url, user_id, created_at, reply_count, like_count, profiles(username, name, image_url, banner_url)'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setPosts(data as any);
      }
    };
    fetchPosts();

    const subscription = supabase
      .from(`posts:user_id=eq.${userId}`)
      .on('INSERT', payload => {
        setPosts(prev => {
          const updated = [payload.new as Post, ...prev];
          return updated.sort((a, b) =>
            a.created_at > b.created_at ? -1 : a.created_at < b.created_at ? 1 : 0
          );
        });
      })
      .on('UPDATE', payload => {
        setPosts(prev => {
          const idx = prev.findIndex(p => p.id === payload.new.id);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...(prev[idx] as Post), ...(payload.new as Post) };
          return updated.sort((a, b) =>
            a.created_at > b.created_at ? -1 : a.created_at < b.created_at ? 1 : 0
          );
        });
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription as any);
    };

  }, [userId]);

  return (
    <View style={styles.container}>
      {profileInfo?.banner_url ? (
        <Image source={{ uri: profileInfo.banner_url }} style={styles.banner} />
      ) : (
        <View style={[styles.banner, styles.placeholder]} />
      )}
      <View style={styles.backButton}>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.profileRow}>
        {profileInfo?.image_url ? (
          <Image source={{ uri: profileInfo.image_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]} />
        )}
        <View style={styles.textContainer}>
          {profileInfo?.name && <Text style={styles.name}>{profileInfo.name}</Text>}
          {profileInfo && (
            <Text style={styles.username}>@{profileInfo.username}</Text>
          )}
        </View>
      </View>
      <PostList posts={posts} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  banner: {
    width: '100%',
    height: Dimensions.get('window').height * 0.25,
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  placeholder: { backgroundColor: '#ffffff20' },
  textContainer: { marginLeft: 15 },
  username: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  name: { color: 'white', fontSize: 20, marginTop: 4 },

});
