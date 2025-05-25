import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

const CHILD_PREFIX = 'cached_child_replies_';

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

interface Reply {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
  } | null;
}

export default function ReplyDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, profile } = useAuth() as any;
  const parent = route.params.reply as Reply;

  const STORAGE_KEY = `${CHILD_PREFIX}${parent.id}`;

  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<Reply[]>([]);

  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from('replies')
      .select('id, post_id, parent_id, user_id, content, created_at, username')
      .eq('parent_id', parent.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setReplies(prev => {
        const temp = prev.filter(r => r.id.startsWith('temp-'));
        const merged = [...temp, ...(data as Reply[])];
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
      post_id: parent.post_id,
      parent_id: parent.id,
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

    let { data, error } = await supabase
      .from('replies')
      .insert([
        {
          post_id: parent.post_id,
          parent_id: parent.id,
          user_id: user.id,
          content: replyText,
          username: profile.display_name || profile.username,
        },
      ])
      .select()
      .single();
    if (error?.code === 'PGRST204') {
      error = null;
    }

    if (!error) {
      if (data) {
        setReplies(prev =>
          prev.map(r => (r.id === newReply.id ? { ...r, id: data.id, created_at: data.created_at } : r)),
        );
      }
      fetchReplies();
    }
  };

  const name = parent.profiles?.display_name || parent.profiles?.username || parent.username;

  return (
    <View style={styles.container}>
      <View style={styles.backButton}>
        <Button title="Return" onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.post}>
        <Text style={styles.username}>@{name}</Text>
        <Text style={styles.postContent}>{parent.content}</Text>
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
          const childName = item.profiles?.display_name || item.profiles?.username || item.username;
          return (
            <TouchableOpacity onPress={() => navigation.push('ReplyDetail', { reply: item })}>

              <View style={styles.reply}>
                <Text style={styles.username}>@{childName}</Text>
                <Text style={styles.postContent}>{item.content}</Text>
                <Text style={styles.timestamp}>{timeAgo(item.created_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 100,
    backgroundColor: colors.background,
  },
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
  timestamp: { fontSize: 10, color: 'gray' },
  input: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
});
