import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

const REPLY_STORAGE_PREFIX = 'cached_replies_';

interface Post {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  username?: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
  } | null;
}

interface Reply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
  } | null;
}

export default function PostDetailScreen() {
  const route = useRoute<any>();
  const { user, profile } = useAuth() as any;
  const post = route.params.post as Post;

  const STORAGE_KEY = `${REPLY_STORAGE_PREFIX}${post.id}`;

  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<Reply[]>([]);

  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from('replies')
      // fetch only reply fields to avoid missing relationship errors
      .select('id, post_id, user_id, content, created_at, username')
      .eq('post_id', post.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setReplies(prev => {
        // Keep any replies that haven't been synced yet (ids starting with "temp-")
        const tempReplies = prev.filter(r => r.id.startsWith('temp-'));
        const merged = [...tempReplies, ...(data as Reply[])];

        merged.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),

        );

        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });

    }
  };

  useEffect(() => {
    const loadCached = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setReplies(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse cached replies', e);
        }
      }

      fetchReplies();
    };

    loadCached();
  }, []);


  const handleReply = async () => {
    if (!replyText.trim() || !user) return;

    const newReply: Reply = {
      id: `temp-${Date.now()}`,
      post_id: post.id,
      user_id: user.id,
      content: replyText,
      created_at: new Date().toISOString(),
      username: profile.display_name || profile.username,
      profiles: { username: profile.username, display_name: profile.display_name },
    };

    setReplies(prev => {
      const updated = [newReply, ...prev];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setReplyText('');

    try {
      const { data, error } = await supabase

        .from('replies')
        .insert([
          {
            post_id: post.id,
            user_id: user.id,
            content: replyText,
            username: profile.display_name || profile.username,
          },
        ])
        .select()
        .single();

      // PGRST204 means the insert succeeded but no row was returned
      if (error?.code === 'PGRST204') {
        // Treat as success and keep the optimistic reply. We rely on
        // fetchReplies() to load the new row instead of retrying the insert.
        if (data) {
          setReplies(prev =>
            prev.map(r =>
              r.id === newReply.id ? { ...r, id: data.id, created_at: data.created_at } : r,
            ),
          );
        }
        fetchReplies();
        return;
      }

      if (!error) {
        if (data) {
          setReplies(prev =>
            prev.map(r =>
              r.id === newReply.id ? { ...r, id: data.id, created_at: data.created_at } : r,
            ),
          );
        }
        // Whether or not data was returned, refresh from the server so the reply persists
        fetchReplies();
      } else {
        console.error('Failed to reply:', error);
        Alert.alert('Reply failed', error.message ?? 'Unable to create reply');
        // Keep the optimistic reply so the user doesn't lose their input
      }
    } catch (err: any) {
      console.error('Failed to reply:', err);
      Alert.alert('Reply failed', err?.message ?? 'Unable to create reply');
      // Keep the optimistic reply so the user doesn't lose their input

    }
  };

  const displayName = post.profiles?.display_name || post.profiles?.username || post.username;

  return (
    <View style={styles.container}>
      <View style={styles.post}>
        <Text style={styles.username}>@{displayName}</Text>
        <Text style={styles.postContent}>{post.content}</Text>
      </View>

      <TextInput
        placeholder="Write a reply"
        value={replyText}
        onChangeText={setReplyText}
        style={styles.input}
        multiline
      />
      <Button title="Post" onPress={handleReply} />

      <FlatList
        data={replies}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const name = item.profiles?.display_name || item.profiles?.username || item.username;
          return (
            <View style={styles.reply}>
              <Text style={styles.username}>@{name}</Text>
              <Text style={styles.postContent}>{item.content}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  post: {
    backgroundColor: '#ffffff10',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  reply: {
    backgroundColor: '#ffffff10',
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
  },
  postContent: { color: 'white' },
  username: { fontWeight: 'bold', color: 'white' },
  input: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
});
