import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
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

export default function ReplyDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, profile } = useAuth() as any;
  const parent = route.params.reply as Reply;
  const originalPost = route.params.originalPost as Post | undefined;


  const STORAGE_KEY = `${CHILD_PREFIX}${parent.id}`;

  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<Reply[]>([]);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

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

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboardOffset(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardOffset(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
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

  const handleDeleteReply = async (id: string) => {
    const { error } = await supabase.from('replies').delete().eq('id', id);
    if (error) {
      Alert.alert('Delete failed', error.message);
    }
    setReplies(prev => {
      const updated = prev.filter(r => r.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const confirmDeleteReply = (id: string) => {
    Alert.alert('Delete reply', 'Are you sure you want to delete this reply?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteReply(id) },
    ]);
  };

  const handleDeletePost = async (id: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) {
      Alert.alert('Delete failed', error.message);
    } else {
      navigation.goBack();
    }
  };

  const confirmDeletePost = (id: string) => {
    Alert.alert('Delete post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeletePost(id) },
    ]);
  };


  const name =
    parent.profiles?.display_name || parent.profiles?.username || parent.username;
  const originalName = originalPost
    ? originalPost.profiles?.display_name ||
      originalPost.profiles?.username ||
      originalPost.username
    : undefined;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <View style={styles.backButton}>
        <Button title="Return" onPress={() => navigation.goBack()} />
      </View>
      <FlatList
        ListHeaderComponent={() => (
          <>
            {originalPost && (
              <View style={[styles.post, styles.highlightPost]}>
                {originalPost.user_id === user?.id && (
                  <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDeletePost(originalPost.id)}>
                    <Text style={styles.deleteText}>X</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.username}>@{originalName}</Text>
                <Text style={styles.postContent}>{originalPost.content}</Text>
                <Text style={styles.timestamp}>{timeAgo(originalPost.created_at)}</Text>
              </View>
            )}
            <View style={styles.post}>
              {parent.user_id === user?.id && (
                <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDeleteReply(parent.id)}>
                  <Text style={styles.deleteText}>X</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.username}>@{name}</Text>
              <Text style={styles.postContent}>{parent.content}</Text>
              <Text style={styles.timestamp}>{timeAgo(parent.created_at)}</Text>
            </View>
          </>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        data={replies}
        keyExtractor={item => item.id}

        renderItem={({ item }) => {
          const childName = item.profiles?.display_name || item.profiles?.username || item.username;
          return (
            <TouchableOpacity onPress={() => navigation.push('ReplyDetail', { reply: item, originalPost })}>
              <View style={styles.reply}>
                {item.user_id === user?.id && (
                  <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDeleteReply(item.id)}>
                    <Text style={styles.deleteText}>X</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.username}>@{childName}</Text>
                <Text style={styles.postContent}>{item.content}</Text>
                <Text style={styles.timestamp}>{timeAgo(item.created_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={[styles.inputContainer, { bottom: keyboardOffset }]}>
        <TextInput
          placeholder="Write a reply"
          value={replyText}
          onChangeText={setReplyText}
          style={styles.input}
          multiline
        />
        <Button title="Post" onPress={handleReply} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 100,
    paddingBottom: 0,
    backgroundColor: colors.background,
  },
  post: {
    backgroundColor: '#ffffff10',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    position: 'relative',
  },
  reply: {
    backgroundColor: '#ffffff10',
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
    position: 'relative',
  },
  highlightPost: {
    borderColor: '#4f1fde',
    borderWidth: 2,

  },
  highlightPost: {
    borderColor: '#4f1fde',
    borderWidth: 2,

  },
  highlightPost: {
    borderColor: '#4f1fde',
    borderWidth: 2,

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
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  deleteText: { color: 'white', fontWeight: 'bold' },
  inputContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    backgroundColor: colors.background,
    paddingBottom: 16,

  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  deleteText: { color: 'red', fontWeight: 'bold' },
});
