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
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

const REPLY_STORAGE_PREFIX = 'cached_replies_';

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

export default function PostDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, profile, profileImageUri } = useAuth() as any;
  const post = route.params.post as Post;

  const STORAGE_KEY = `${REPLY_STORAGE_PREFIX}${post.id}`;

  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<Reply[]>([]);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const confirmDeletePost = (id: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDeletePost(id),
      },
    ]);
  };

  const handleDeletePost = async (id: string) => {
    await supabase.from('posts').delete().eq('id', id);
    navigation.goBack();
  };

  const confirmDeleteReply = (id: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDeleteReply(id),
      },
    ]);
  };

  const handleDeleteReply = async (id: string) => {
    setReplies(prev => {
      const updated = prev.filter(r => r.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    await supabase.from('replies').delete().eq('id', id);
  };

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

  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from('replies')
      // fetch only reply fields to avoid missing relationship errors
      .select('id, post_id, parent_id, user_id, content, created_at, username')
      .eq('post_id', post.id)
      .is('parent_id', null)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setReplies(prev => {
        // Keep any replies that haven't been synced yet (ids starting with "temp-")
        const tempReplies = prev.filter(r => r.id.startsWith('temp-'));
        const merged = [...tempReplies, ...(data as Reply[])];


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
      parent_id: null,
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
            post_id: post.id,
            parent_id: null,
            user_id: user.id,
            content: replyText,
            username: profile.display_name || profile.username,
          },
        ])
        .select()
        .single();
    // PGRST204 means the insert succeeded but no row was returned
    if (error?.code === 'PGRST204') {
      error = null;
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
      // Keep the optimistic reply so the user doesn't lose their input
    }
  };

  const displayName = post.profiles?.display_name || post.profiles?.username || post.username;
  const userName = post.profiles?.username || post.username;

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
          <View style={[styles.post, styles.highlightPost]}>
            {user?.id === post.user_id && (
              <TouchableOpacity
                onPress={() => confirmDeletePost(post.id)}
                style={styles.deleteButton}
              >
                <Text style={{ color: 'white' }}>X</Text>
              </TouchableOpacity>
            )}
            <View style={styles.row}>
              {user?.id === post.user_id && profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.placeholder]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.username}>
                  {displayName} @{userName}
                </Text>
                <Text style={styles.postContent}>{post.content}</Text>
                <Text style={styles.timestamp}>{timeAgo(post.created_at)}</Text>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        data={replies}
        keyExtractor={item => item.id}
          renderItem={({ item }) => {
          const name = item.profiles?.display_name || item.profiles?.username || item.username;
          const replyUserName = item.profiles?.username || item.username;
          const isMe = user?.id === item.user_id;
          const avatarUri = isMe ? profileImageUri : undefined;
          return (
            <TouchableOpacity
              onPress={() =>
                navigation.push('ReplyDetail', {
                  reply: item,
                  originalPost: post,
                  ancestors: [],
                })
              }
            >
              <View style={styles.reply}>
                {isMe && (
                  <TouchableOpacity
                    onPress={() => confirmDeleteReply(item.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={{ color: 'white' }}>X</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.row}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.placeholder]} />
                  )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.username}>
                        {name} @{replyUserName}
                      </Text>
                      <Text style={styles.postContent}>{item.content}</Text>
                      <Text style={styles.timestamp}>{timeAgo(item.created_at)}</Text>
                    </View>
                </View>
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
    backgroundColor: colors.background,
  },
  post: {
    backgroundColor: '#ffffff10',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    position: 'relative',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  placeholder: { backgroundColor: '#555' },
  highlightPost: {
    borderColor: '#4f1fde',
    borderWidth: 2,

  },
  reply: {
    backgroundColor: '#ffffff10',
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
    position: 'relative',
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
    right: 6,
    top: 6,
    padding: 4,
  },
  inputContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    backgroundColor: colors.background,
    paddingBottom: 16,
  },
});
