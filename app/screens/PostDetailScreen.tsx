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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

const REPLY_STORAGE_PREFIX = 'cached_replies_';
const COUNT_STORAGE_KEY = 'cached_reply_counts';
const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';


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
  reply_count?: number;
  like_count?: number;
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
  reply_count?: number;
  like_count?: number;
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
  const [allReplies, setAllReplies] = useState<Reply[]>([]);
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [likedItems, setLikedItems] = useState<{ [key: string]: boolean }>({});

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

  const refreshLikeCount = async (id: string, isPost: boolean) => {
    const { data } = await supabase
      .from(isPost ? 'posts' : 'replies')
      .select('like_count')
      .eq('id', id)
      .single();
    if (data) {
      setLikeCounts(prev => {
        const counts = { ...prev, [id]: data.like_count ?? 0 };
        AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
        return counts;
      });
    }
  };

  const toggleLike = async (id: string, isPost: boolean) => {
    if (!user) return;
    const liked = likedItems[id];
    setLikedItems(prev => {
      const updated = { ...prev, [id]: !liked };
      AsyncStorage.setItem(
        `${LIKED_KEY_PREFIX}${user.id}`,
        JSON.stringify(updated),
      );
      return updated;
    });
    setLikeCounts(prev => {
      const count = (prev[id] || 0) + (liked ? -1 : 1);
      const counts = { ...prev, [id]: count };
      AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
      return counts;
    });
    if (liked) {
      await supabase
        .from('likes')
        .delete()
        .match({ user_id: user.id, [isPost ? 'post_id' : 'reply_id']: id });
    } else {
      await supabase
        .from('likes')
        .insert({ user_id: user.id, [isPost ? 'post_id' : 'reply_id']: id });
    }
    await refreshLikeCount(id, isPost);
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
      const counts = { ...rest, [post.id]: (prev[post.id] || 0) - removed };
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
      return counts;
    });
    setLikeCounts(prev => {
      const { [id]: _om, ...rest } = prev;
      AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(rest));
      return rest;
    });
    setLikedItems(prev => {
      const { [id]: _om, ...rest } = prev;
      AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user?.id}`, JSON.stringify(rest));
      return rest;
    });
    await supabase.from('replies').delete().eq('id', id);
    fetchReplies();
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
        const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
        if (likeStored) {
          try {
            setLikeCounts(prev => ({ ...prev, ...JSON.parse(likeStored) }));
          } catch (e) {
            console.error('Failed to parse cached like counts', e);
          }
        }
        if (user) {
          const likedStored = await AsyncStorage.getItem(`${LIKED_KEY_PREFIX}${user.id}`);
          if (likedStored) {
            try {
              setLikedItems(JSON.parse(likedStored));
            } catch (e) {
              console.error('Failed to parse cached likes', e);
            }

          }
        }
      };
      refreshCounts();
      fetchReplies();
    }, []),
  );



  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from('replies')
      .select('id, post_id, parent_id, user_id, content, created_at, reply_count, like_count, username')

      .eq('post_id', post.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      const all = data as Reply[];
      setAllReplies(all);
      const topLevel = all.filter(r => r.parent_id === null);
      setReplies(prev => {
        const tempReplies = prev.filter(r => r.id.startsWith('temp-'));
        const merged = [...tempReplies, ...topLevel];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });

      const { data: postData } = await supabase
        .from('posts')
        .select('reply_count, like_count')
        .eq('id', post.id)
        .single();
      const entries = all.map(r => [r.id, r.reply_count ?? 0]);
      if (postData) entries.push([post.id, postData.reply_count ?? all.length]);
      else entries.push([post.id, post.reply_count ?? all.length]);
      setReplyCounts(prev => {
        const counts = { ...prev, ...Object.fromEntries(entries) };
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
        return counts;
      });
      const likeEntries = all.map(r => [r.id, r.like_count ?? 0]);
      const { data: postLike } = await supabase
        .from('posts')
        .select('like_count')
        .eq('id', post.id)
        .single();
      if (postLike) likeEntries.push([post.id, postLike.like_count ?? 0]);
      else likeEntries.push([post.id, post.like_count ?? 0]);
      setLikeCounts(prev => {
        const counts = { ...prev, ...Object.fromEntries(likeEntries) };
        AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
        return counts;
      });

      if (user) {
        const { data: likedData } = await supabase
          .from('likes')
          .select('post_id, reply_id')
          .eq('user_id', user.id);
        if (likedData) {
          const map: any = {};
          likedData.forEach((l: any) => {
            const key = l.post_id || l.reply_id;
            map[key] = true;
          });
          setLikedItems(map);
          AsyncStorage.setItem(
            `${LIKED_KEY_PREFIX}${user.id}`,
            JSON.stringify(map),
          );
        }
      }

      
      if (postData) likeEntries.push([post.id, postData.like_count ?? 0]);
      else likeEntries.push([post.id, post.like_count ?? 0]);
      setLikeCounts(prev => {
        const counts = { ...prev, ...Object.fromEntries(likeEntries) };
        AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
        return counts;
      });

      if (user) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('post_id, reply_id')
          .eq('user_id', user.id);
        if (likeData) {
          const likedObj: { [key: string]: boolean } = {};
          likeData.forEach(l => {
            if (l.post_id) likedObj[l.post_id] = true;
            if (l.reply_id) likedObj[l.reply_id] = true;
          });
          setLikedItems(likedObj);
          AsyncStorage.setItem(
            `${LIKED_KEY_PREFIX}${user.id}`,
            JSON.stringify(likedObj),
          );
        }
      }


    }
  };

  useEffect(() => {
    const loadCached = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const countStored = await AsyncStorage.getItem(COUNT_STORAGE_KEY);
      const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
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
          entries.push([post.id, post.reply_count ?? cached.length]);
          const counts = { ...storedCounts, ...Object.fromEntries(entries) };
          setReplyCounts(counts);
          AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
          const likeEntries = cached.map((r: any) => [r.id, r.like_count ?? 0]);
          likeEntries.push([post.id, post.like_count ?? 0]);
          const likeCountsObj = Object.fromEntries(likeEntries);
          setLikeCounts(likeCountsObj);
          AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(likeCountsObj));


        } catch (e) {
          console.error('Failed to parse cached replies', e);
        }
      }

      if (countStored && !stored) {
        setReplyCounts(storedCounts);
      }
      if (likeStored) {
        try {
          setLikeCounts(JSON.parse(likeStored));
        } catch (e) {
          console.error('Failed to parse cached like counts', e);
        }
      }
      if (user) {
        const likedStored = await AsyncStorage.getItem(`${LIKED_KEY_PREFIX}${user.id}`);
        if (likedStored) {
          try {
            setLikedItems(JSON.parse(likedStored));
          } catch (e) {
            console.error('Failed to parse cached likes', e);
          }
        }
      }

      
      if (likeStored) {
        try {
          setLikeCounts(JSON.parse(likeStored));
        } catch (e) {
          console.error('Failed to parse cached like counts', e);
        }
      }
        // Legacy storage key for liked state; retained for backward compatibility
        const legacyLiked = await AsyncStorage.getItem('LIKE_STATE_KEY');
        if (legacyLiked) {
          try {
            const parsed = JSON.parse(legacyLiked);
            setLikedItems(parsed);
            AsyncStorage.setItem(
              `${LIKED_KEY_PREFIX}${user.id}`,
              JSON.stringify(parsed),
            );
          } catch (e) {
            console.error('Failed to parse cached likes', e);
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
      reply_count: 0,
      like_count: 0,
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
        [post.id]: (prev[post.id] || 0) + 1,
        [newReply.id]: 0,
      };

      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
      return counts;
    });
    setLikeCounts(prev => {
      const counts = { ...prev, [newReply.id]: 0 };
      AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
      return counts;

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
        setReplyCounts(prev => {
          const temp = prev[newReply.id] ?? 0;
          const { [newReply.id]: _omit, ...rest } = prev;
          const counts = { ...rest, [data.id]: temp, [post.id]: prev[post.id] || 0 };
          AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
          return counts;
        });
        setLikeCounts(prev => {
          const temp = prev[newReply.id] ?? 0;
          const { [newReply.id]: _omit, ...rest } = prev;
          const counts = { ...rest, [data.id]: temp };
          AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
          return counts;
        });

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
            <View style={styles.replyCountContainer}>
              <Ionicons
                name="chatbubble-outline"
                size={12}
                color="#66538f"
                style={{ marginRight: 2 }}
              />
              <Text style={styles.replyCount}>{replyCounts[post.id] || 0}</Text>
            </View>
            <TouchableOpacity
              style={styles.likeContainer}
              onPress={() => toggleLike(post.id, true)}
            >
              <Ionicons
                name={likedItems[post.id] ? 'heart' : 'heart-outline'}

                size={12}
                color="red"
                style={{ marginRight: 2 }}
              />
              <Text style={styles.replyCount}>{likeCounts[post.id] || 0}</Text>
            </TouchableOpacity>

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
                  <View style={styles.replyCountContainer}>
                    <Ionicons
                      name="chatbubble-outline"
                      size={12}
                      color="#66538f"
                      style={{ marginRight: 2 }}
                    />
                    <Text style={styles.replyCount}>{replyCounts[item.id] || 0}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.likeContainer}
                    onPress={() => toggleLike(item.id, false)}
                  >
                    <Ionicons
                      name={likedItems[item.id] ? 'heart' : 'heart-outline'}

                      size={12}
                      color="red"
                      style={{ marginRight: 2 }}
                    />
                    <Text style={styles.replyCount}>{likeCounts[item.id] || 0}</Text>
                  </TouchableOpacity>

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
  highlightPost: {
    borderColor: '#4f1fde',
    borderWidth: 2,

  },
  reply: {
    backgroundColor: '#ffffff10',
    borderRadius: 0,
    padding: 10,
    marginTop: 0,
    borderBottomColor: 'gray',
    borderBottomWidth: StyleSheet.hairlineWidth,

    position: 'relative',
  },
  postContent: { color: 'white' },
  username: { fontWeight: 'bold', color: 'white' },
  timestamp: { fontSize: 10, color: 'gray' },
  replyCountContainer: {
    position: 'absolute',
    bottom: 6,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyCount: { fontSize: 10, color: 'gray' },
  likeContainer: {
    position: 'absolute',
    bottom: 6,
    left: '50%',
    transform: [{ translateX: -6 }],
    flexDirection: 'row',
    alignItems: 'center',
  },

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
