import React, { useEffect, useState, useCallback } from 'react';
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
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

const CHILD_PREFIX = 'cached_child_replies_';
const COUNT_STORAGE_KEY = 'cached_reply_counts';

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
  reply_count?: number;
  username?: string;
  reply_count?: number;
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
  reply_count?: number;
  username?: string;
  reply_count?: number;
  profiles?: {
    username: string | null;
    display_name: string | null;
  } | null;
}

export default function ReplyDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, profile, profileImageUri } = useAuth() as any;
  const parent = route.params.reply as Reply;
  const originalPost = route.params.originalPost as Post | undefined;
  const ancestors = (route.params.ancestors as Reply[]) || [];


  const STORAGE_KEY = `${CHILD_PREFIX}${parent.id}`;

  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<Reply[]>([]);
  const [allReplies, setAllReplies] = useState<Reply[]>([]);
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
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
    // Remove from local state
    setReplies(prev => {
      const updated = prev.filter(r => r.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setAllReplies(prev => {
      const descendants = new Set<string>();
      const gather = (parentId: string) => {
        prev.forEach(r => {
          if (r.parent_id === parentId) {
            descendants.add(r.id);
            gather(r.id);
          }
        });
      };
      gather(id);
      return prev.filter(r => r.id !== id && !descendants.has(r.id));
    });
    setReplyCounts(prev => {
      const descendants = new Set<string>();
      const gather = (parentId: string) => {
        allReplies.forEach(r => {
          if (r.parent_id === parentId) {
            descendants.add(r.id);
            gather(r.id);
          }
        });
      };
      gather(id);
      let removed = descendants.size + 1;
      const { [id]: _omit, ...rest } = prev;
      descendants.forEach(d => delete rest[d]);
      const counts = { ...rest, [parent.id]: (prev[parent.id] || 0) - removed };
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
      return counts;
    });

    await supabase.from('replies').delete().eq('id', id);
    fetchReplies();
  };


  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from('replies')
      .select('id, post_id, parent_id, user_id, content, created_at, reply_count, username')

      .eq('post_id', parent.post_id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      const all = data as Reply[];
      setAllReplies(all);
      const children = all.filter(r => r.parent_id === parent.id);
      setReplies(prev => {
        const temp = prev.filter(r => r.id.startsWith('temp-'));
        const merged = [...temp, ...children];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });

      const { data: postData } = await supabase
        .from('posts')
        .select('reply_count')
        .eq('id', parent.post_id)
        .single();
      const entries = all.map(r => [r.id, r.reply_count ?? 0]);
      if (postData) entries.push([parent.post_id, postData.reply_count ?? all.length]);
      setReplyCounts(prev => {
        const counts = { ...prev, ...Object.fromEntries(entries) };
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
        return counts;
      });

    }
  };

  useEffect(() => {
    const loadCached = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const countStored = await AsyncStorage.getItem(COUNT_STORAGE_KEY);
      let storedCounts: { [key: string]: number } = {};
      if (countStored) {
        try {
          storedCounts = JSON.parse(countStored);
        } catch (e) {
          console.error('Failed to parse cached counts', e);
        }
      }
      if (stored) {
        try {
          const cached = JSON.parse(stored);
          setReplies(cached);
          setAllReplies(cached);
          const entries = cached.map((r: any) => [r.id, r.reply_count ?? 0]);
          const counts = { ...storedCounts, ...Object.fromEntries(entries) };
          setReplyCounts(prev => ({ ...prev, ...counts }));
          AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));

        } catch (e) {
          console.error('Failed to parse cached replies', e);
        }
      } else if (countStored) {
        setReplyCounts(prev => ({ ...prev, ...storedCounts }));
      }
      fetchReplies();
    };
    loadCached();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const refreshCounts = async () => {
        const stored = await AsyncStorage.getItem(COUNT_STORAGE_KEY);
        if (stored) {
          try {
            setReplyCounts(prev => ({ ...prev, ...JSON.parse(stored) }));
          } catch (e) {
            console.error('Failed to parse cached counts', e);
          }
        }
      };
      refreshCounts();
      fetchReplies();
    }, []),
  );

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
      reply_count: 0,
      username: profile.display_name || profile.username,
      reply_count: 0,
      profiles: { username: profile.username, display_name: profile.display_name },
    };

    setReplies(prev => {
      const updated = [newReply, ...prev];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setAllReplies(prev => [...prev, newReply]);
    setReplyCounts(prev => {
      const counts = {
        ...prev,
        [parent.id]: (prev[parent.id] || 0) + 1,
        [newReply.id]: 0,
      };
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
      return counts;
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
          prev.map(r =>
            r.id === newReply.id
              ? { ...r, id: data.id, created_at: data.created_at, reply_count: 0 }
              : r,
          ),
        );
        setAllReplies(prev =>
          prev.map(r =>
            r.id === newReply.id
              ? { ...r, id: data.id, created_at: data.created_at, reply_count: 0 }
              : r,
          ),

        );
        setAllReplies(prev =>
          prev.map(r => (r.id === newReply.id ? { ...r, id: data.id, created_at: data.created_at } : r)),
        );
        setAllReplies(prev =>
          prev.map(r => (r.id === newReply.id ? { ...r, id: data.id, created_at: data.created_at } : r)),
        );
        setReplyCounts(prev => {
          const temp = prev[newReply.id] ?? 0;
          const { [newReply.id]: _omit, ...rest } = prev;
          const counts = { ...rest, [data.id]: temp, [parent.id]: prev[parent.id] || 0 };
          AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
          return counts;
        });

      }
      fetchReplies();
    }
  };

  const name =
    parent.profiles?.display_name || parent.profiles?.username || parent.username;
  const parentUserName = parent.profiles?.username || parent.username;
  const originalName = originalPost
    ?
        originalPost.profiles?.display_name ||
        originalPost.profiles?.username ||
        originalPost.username
    : undefined;
  const originalUserName =
    originalPost?.profiles?.username || originalPost?.username;

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
                  <View style={styles.threadLine} pointerEvents="none" />
                  {user?.id === originalPost.user_id && (
                    <TouchableOpacity
                      onPress={() => confirmDeletePost(originalPost.id)}
                      style={styles.deleteButton}
                    >

                    <Text style={{ color: 'white' }}>X</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.row}>
                  {user?.id === originalPost.user_id && profileImageUri ? (
                    <Image source={{ uri: profileImageUri }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.placeholder]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.username}>
                      {originalName} @{originalUserName}
                    </Text>
                    <Text style={styles.postContent}>{originalPost.content}</Text>
                    <Text style={styles.timestamp}>{timeAgo(originalPost.created_at)}</Text>
                  </View>
                </View>
                <Text style={styles.replyCount}>{replyCounts[originalPost.id] || 0}</Text>
              </View>
            )}
              {ancestors.map(a => {
                const ancestorName =
                  a.profiles?.display_name || a.profiles?.username || a.username;
                const ancestorUserName = a.profiles?.username || a.username;
                const isMe = user?.id === a.user_id;
                const avatarUri = isMe ? profileImageUri : undefined;
                return (
                <View key={a.id} style={styles.post}>
                  <View style={styles.threadLine} pointerEvents="none" />

                  {isMe && (
                    <TouchableOpacity
                      onPress={() => confirmDeleteReply(a.id)}
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
                        {ancestorName} @{ancestorUserName}
                      </Text>
                      <Text style={styles.postContent}>{a.content}</Text>
                    <Text style={styles.timestamp}>{timeAgo(a.created_at)}</Text>
                  </View>
                </View>
                <Text style={styles.replyCount}>{replyCounts[a.id] || 0}</Text>
              </View>
            );
          })}

            <View style={styles.post}>
              {user?.id === parent.user_id && (
                <TouchableOpacity
                  onPress={() => confirmDeleteReply(parent.id)}
                  style={styles.deleteButton}
                >
                  <Text style={{ color: 'white' }}>X</Text>
                </TouchableOpacity>
              )}
              <View style={styles.row}>
                {user?.id === parent.user_id && profileImageUri ? (
                  <Image source={{ uri: profileImageUri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.placeholder]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.username}>
                    {name} @{parentUserName}
                  </Text>
                  <Text style={styles.postContent}>{parent.content}</Text>
                  <Text style={styles.timestamp}>{timeAgo(parent.created_at)}</Text>
                </View>
              </View>
            <Text style={styles.replyCount}>{replyCounts[parent.id] || 0}</Text>
            </View>
          </>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        data={replies}
        keyExtractor={item => item.id}

        renderItem={({ item }) => {
          const childName = item.profiles?.display_name || item.profiles?.username || item.username;
          const childUserName = item.profiles?.username || item.username;
          const isMe = user?.id === item.user_id;
          const avatarUri = isMe ? profileImageUri : undefined;
          return (
            <TouchableOpacity
              onPress={() =>
                navigation.push('ReplyDetail', {
                  reply: item,
                  originalPost,
                  ancestors: [...ancestors, parent],
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
                      {childName} @{childUserName}
                    </Text>
                    <Text style={styles.postContent}>{item.content}</Text>
                    <Text style={styles.timestamp}>{timeAgo(item.created_at)}</Text>
                  </View>
                </View>
                <Text style={styles.replyCount}>{replyCounts[item.id] || 0}</Text>
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
    paddingHorizontal: 0,
    paddingTop: 100,
    paddingBottom: 0,
    backgroundColor: colors.background,
  },
  post: {
    backgroundColor: '#ffffff10',
    borderRadius: 0,
    padding: 10,
    marginBottom: 0,
    borderBottomColor: 'gray',
    borderBottomWidth: StyleSheet.hairlineWidth,

    position: 'relative',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  placeholder: { backgroundColor: '#555' },
  reply: {
    backgroundColor: '#ffffff10',
    borderRadius: 0,
    padding: 10,
    marginTop: 0,
    borderBottomColor: 'gray',
    borderBottomWidth: StyleSheet.hairlineWidth,

    position: 'relative',
  },
  threadLine: {
    position: 'absolute',
    left: 26,
    top: 0,
    bottom: -10,
    width: 2,
    backgroundColor: '#66538f',
    zIndex: -1,
  },
  highlightPost: {
    borderColor: '#4f1fde',
    borderWidth: 2,

  },
  postContent: { color: 'white' },
  username: { fontWeight: 'bold', color: 'white' },
  timestamp: { fontSize: 10, color: 'gray' },
  replyCount: { position: 'absolute', bottom: 6, left: 10, fontSize: 10, color: 'gray' },
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
