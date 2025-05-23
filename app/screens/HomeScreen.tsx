import React, { useEffect, useState } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

type Post = {
  id: string;
  content: string;
  username?: string;
  user_id: string;
  created_at: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
  } | null;
};

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);

  const STORAGE_KEY = 'cached_posts';

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setPosts(JSON.parse(raw));
        }
      } catch (err) {
        console.error('Failed to load cached posts', err);
      }

      // Always refresh from Supabase to stay up to date
      fetchPosts();
    };

    loadPosts();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(posts)).catch((err) =>
      console.error('Failed to cache posts', err)
    );
  }, [posts]);


  

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('id, content, user_id, created_at, profiles(username, display_name)')
      .order('created_at', { ascending: false });

    if (!error && data) setPosts(data as Post[]);
  };

  const handlePost = async () => {
    if (!postText.trim()) return;

    if (!user) return;

    const newPost: Post = {
      id: `temp-${Date.now()}`,
      content: postText,
      username: profile.display_name || profile.username,
      user_id: user.id,
      created_at: new Date().toISOString(),
      profiles: {
        username: profile.username,
        display_name: profile.display_name,
      },
    };

    // Show the post immediately
    setPosts((prev) => [newPost, ...prev]);
    setPostText('');


    let { data, error } = await supabase
      .from('posts')
      .insert([
        {
          content: postText,
          user_id: user.id,
          username: profile.display_name || profile.username,
        },
      ])

      .select()
      .single();

    if (error?.code === 'PGRST204') {

      const retry = await supabase
        .from('posts')
        .insert([
          { content: postText, user_id: user.id },
        ])
        .select()
        .single();
      data = retry.data;
      error = retry.error;

    }

    if (!error && data) {
      // Update the optimistic post with the real data from Supabase
      setPosts((prev) =>
        prev.map((p) =>
          p.id === newPost.id
            ? {
                ...p,
                id: data.id,
                created_at: data.created_at,
              }
            : p
        )
      );

      // Refresh from the server in the background to stay in sync
      fetchPosts();
    } else {
      // Remove the optimistic post if it failed to persist
      setPosts((prev) => prev.filter((p) => p.id !== newPost.id));

      // Log the failure and surface it to the user
      console.error('Failed to post:', error);
      Alert.alert('Post failed', error?.message ?? 'Unable to create post');
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    
    <View style={styles.container}>
      <TextInput
        placeholder="What's happening?"
        value={postText}
        onChangeText={setPostText}
        style={styles.input}
        multiline
      />
      <Button title="Post" onPress={handlePost} />
      
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const displayName =
            item.profiles?.display_name ||
            item.profiles?.username ||
            item.username;
          return (
            <View style={styles.post}>
              <Text style={styles.username}>@{displayName}</Text>
              <Text style={styles.postText}>{item.content}</Text>
              <Text style={styles.timestamp}>{timeAgo(item.created_at)}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  input: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  post: {
    backgroundColor: '#ffffff10',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  postText: { color: colors.text },
  username: { fontWeight: 'bold', color: colors.text },
  timestamp: { fontSize: 10, color: 'gray' },
});
