import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

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

  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<Reply[]>([]);

  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from('replies')
      .select('id, post_id, user_id, content, created_at, profiles(username, display_name)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setReplies(data as Reply[]);
    }
  };

  useEffect(() => {
    fetchReplies();
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

    setReplies(prev => [newReply, ...prev]);
    setReplyText('');

    let { data, error } = await supabase
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

    if (error?.code === 'PGRST204') {
      const retry = await supabase
        .from('replies')
        .insert([{ post_id: post.id, user_id: user.id, content: replyText }])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (!error && data) {
      setReplies(prev =>
        prev.map(r =>
          r.id === newReply.id ? { ...r, id: data.id, created_at: data.created_at } : r
        )
      );
      fetchReplies();
    } else {
      setReplies(prev => prev.filter(r => r.id !== newReply.id));
      console.error('Failed to reply:', error);
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
