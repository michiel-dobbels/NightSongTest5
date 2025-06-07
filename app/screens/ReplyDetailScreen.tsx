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
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';
import { usePostStore } from '../contexts/PostStoreContext';
import useLike from '../hooks/useLike';

const CHILD_PREFIX = 'cached_child_replies_';
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

interface Reply {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  reply_count?: number;
  like_count?: number;
  username?: string;

  profiles?: {
    username: string | null;
    name: string | null;
    image_url?: string | null;
    banner_url?: string | null;
  } | null;
}

interface Post {
  id: string;
  content: string;
  image_url?: string;
  user_id: string;
  created_at: string;
  reply_count?: number;
  like_count?: number;
  username?: string;

  profiles?: {
    username: string | null;
    name: string | null;
    image_url?: string | null;
    banner_url?: string | null;
  } | null;
}

function LikeInfo({ id, isPost = false }: { id: string; isPost?: boolean }) {
  const { likeCount, liked, toggleLike } = useLike(id, !isPost);
  return (
    <TouchableOpacity style={styles.likeContainer} onPress={toggleLike}>
      <Ionicons
        name={liked ? 'heart' : 'heart-outline'}
        size={18}
        color="red"
        style={{ marginRight: 2 }}
      />
      <Text style={[styles.likeCountLarge, liked && styles.likedLikeCount]}>
        {likeCount}
      </Text>
    </TouchableOpacity>
  );
}

export default function ReplyDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, profile, profileImageUri, bannerImageUri } = useAuth() as any;
  const { initialize, remove } = usePostStore();
  const parent = route.params.reply as Reply;
  const originalPost = route.params.originalPost as Post | undefined;
  const ancestors = (route.params.ancestors as Reply[]) || [];


  const STORAGE_KEY = `${CHILD_PREFIX}${parent.id}`;

  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
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

  const refreshLikeCount = async (id: string, isPost: boolean) => {
    const { count } = await supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .match(isPost ? { post_id: id } : { reply_id: id });

    if (typeof count === 'number') {
      await supabase
        .from(isPost ? 'posts' : 'replies')
        .update({ like_count: count })
        .eq('id', id);
      const stored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
      const map = stored ? JSON.parse(stored) : {};
      map[id] = count;
      AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(map));
    }
  };

  const refreshChainLikes = async () => {
    const replyIds = [parent.id, ...ancestors.map(a => a.id)];
    if (replyIds.length) {
      const entries: [string, number][] = [];
      await Promise.all(
        replyIds.map(async rid => {
          const { count } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('reply_id', rid);
          if (typeof count === 'number') {
            entries.push([rid, count]);
            await supabase.from('replies').update({ like_count: count }).eq('id', rid);
          }
        }),
      );
      if (entries.length) {
        const stored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
        const counts = stored ? JSON.parse(stored) : {};
        Object.assign(counts, Object.fromEntries(entries));
        AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
      }
    }
    if (originalPost) {
      const { count } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', originalPost.id);
      if (typeof count === 'number') {
        await supabase.from('posts').update({ like_count: count }).eq('id', originalPost.id);
        const stored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
        const counts = stored ? JSON.parse(stored) : {};
        counts[originalPost.id] = count;
        AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
      }
    }
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      setReplyImage(`data:image/jpeg;base64,${base64}`);
    }
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
    const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
    const likeMap = likeStored ? JSON.parse(likeStored) : {};
    delete likeMap[id];
    AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(likeMap));
    if (user) {
      const likedStored = await AsyncStorage.getItem(`${LIKED_KEY_PREFIX}${user?.id}`);
      const likedMap = likedStored ? JSON.parse(likedStored) : {};
      delete likedMap[id];
      AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user.id}`, JSON.stringify(likedMap));
    }

    await supabase.from('replies').delete().eq('id', id);
    fetchReplies();
    refreshChainLikes();
  };

  


  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from('replies')
      .select(
        'id, post_id, parent_id, user_id, content, image_url, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)'
      )


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
        .select('reply_count, like_count')
        .eq('id', parent.post_id)
        .single();
      setReplyCounts(prev => {
        const counts = { ...prev };
        all.forEach(r => {
          counts[r.id] = prev[r.id] ?? r.reply_count ?? 0;
        });
        if (postData) {
          counts[parent.post_id] = prev[parent.post_id] ?? postData.reply_count ?? all.length;
        }
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
        return counts;
      });
      const likeEntries = all.map(r => [r.id, r.like_count ?? 0]);
      const { data: postLike } = await supabase
        .from('posts')
        .select('like_count')
        .eq('id', parent.post_id)
        .single();
      const postLikeCount = postLike ? postLike.like_count ?? 0 : undefined;
      if (postLikeCount !== undefined)
        likeEntries.push([parent.post_id, postLikeCount]);
      const fromServer = Object.fromEntries(likeEntries) as Record<string, number>;
      AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(fromServer));
      initialize([
        ...Object.entries(fromServer).map(([id, c]) => ({ id, like_count: c })),
      ]);

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

      refreshChainLikes();

    }
  };

  useEffect(() => {
    const loadCached = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const countStored = await AsyncStorage.getItem(COUNT_STORAGE_KEY);
      const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
      let storedCounts: { [key: string]: number } = {};
      let storedLikes: { [key: string]: number } = {};
      if (countStored) {
        try {
          storedCounts = JSON.parse(countStored);
        } catch (e) {
          console.error('Failed to parse cached counts', e);
        }
      }
      if (likeStored) {
        try {
          storedLikes = JSON.parse(likeStored);
        } catch (e) {
          console.error('Failed to parse cached like counts', e);
        }
      }
      if (stored) {
        try {
          const cached = JSON.parse(stored);
          setReplies(cached);
          setAllReplies(cached);
          const entries = cached.map((r: any) => [r.id, storedCounts[r.id] ?? r.reply_count ?? 0]);
          const counts = { ...storedCounts, ...Object.fromEntries(entries) };
          setReplyCounts(counts);
          AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));

          const likeEntries = cached.map((r: any) => [r.id, storedLikes[r.id] ?? r.like_count ?? 0]);
          const likeCountsObj = {
            ...storedLikes,
            ...Object.fromEntries(likeEntries),
          } as Record<string, number>;
          AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(likeCountsObj));
          initialize([
            { id: parent.post_id, like_count: storedLikes[parent.post_id] ?? 0 },
            ...cached.map((r: any) => ({ id: r.id, like_count: likeCountsObj[r.id] ?? 0 })),
          ]);
        } catch (e) {
          console.error('Failed to parse cached replies', e);
        }
      } else {
        setReplyCounts(storedCounts);
        AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(storedLikes));
        initialize([{ id: parent.post_id, like_count: storedLikes[parent.post_id] ?? 0 }]);
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
      refreshChainLikes();
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
        const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
        if (likeStored) {
          try {
            initialize(
              Object.entries(JSON.parse(likeStored)).map(([id, c]) => ({
                id,
                like_count: c as number,
              })),
            );
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
      refreshChainLikes();
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
    if ((!replyText.trim() && !replyImage) || !user) return;

    const newReply: Reply = {
      id: `temp-${Date.now()}`,
      post_id: parent.post_id,
      parent_id: parent.id,
      user_id: user.id,
      content: replyText,
      image_url: replyImage ?? undefined,
      created_at: new Date().toISOString(),
      reply_count: 0,
      username: profile.name || profile.username,
      like_count: 0,
      profiles: {
        username: profile.username,
        name: profile.name,
        image_url: profileImageUri,
        banner_url: bannerImageUri,
      },
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
    const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
    const likeMap = likeStored ? JSON.parse(likeStored) : {};
    likeMap[newReply.id] = 0;
    await AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(likeMap));
    initialize([{ id: newReply.id, like_count: 0 }]);
    setReplyText('');
    setReplyImage(null);

    let { data, error } = await supabase
      .from('replies')
      .insert([
        {
          post_id: parent.post_id,
          parent_id: parent.id,
          user_id: user.id,
          content: replyText,
          image_url: replyImage,
          username: profile.name || profile.username,
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
        const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
        const likeMap = likeStored ? JSON.parse(likeStored) : {};
        const temp = likeMap[newReply.id] ?? 0;
        delete likeMap[newReply.id];
        likeMap[data.id] = temp;
        await AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(likeMap));
        initialize([{ id: data.id, like_count: temp }]);

      }
      fetchReplies();
      refreshChainLikes();
    }
  };

  const name =
    parent.profiles?.name || parent.profiles?.username || parent.username;
  const parentUserName = parent.profiles?.username || parent.username;
  const originalName = originalPost
    ? originalPost.profiles?.name ||
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
                <View style={[styles.post, styles.highlightPost, styles.longReply]}>
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
                  <TouchableOpacity
                    onPress={() =>
                      user?.id === originalPost.user_id
                        ? navigation.navigate('Profile')
                        : navigation.navigate('UserProfile', {
                            userId: originalPost.user_id,
                            avatarUrl: originalPost.profiles?.image_url,
                            bannerUrl: originalPost.profiles?.banner_url,

                            name: originalName,
                            username: originalUserName,
                          })
                    }
                  >
                    {user?.id === originalPost.user_id && profileImageUri ? (
                      <Image source={{ uri: profileImageUri }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.placeholder]} />
                    )}
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <View style={styles.headerRow}>
                      <Text style={styles.username}>
                        {originalName} @{originalUserName}
                      </Text>
                      <Text style={[styles.timestamp, styles.timestampMargin]}>
                        {timeAgo(originalPost.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.postContent}>{originalPost.content}</Text>
                    {originalPost.image_url && (
                      <Image source={{ uri: originalPost.image_url }} style={styles.postImage} />
                    )}
                  </View>
                </View>
                <View style={styles.replyCountContainer}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={18}
                    color="#66538f"
                    style={{ marginRight: 2 }}
                  />
                  <Text style={styles.replyCountLarge}>{replyCounts[originalPost.id] || 0}</Text>
                </View>
                <LikeInfo id={originalPost.id} isPost />

              </View>
            )}
              {ancestors.map(a => {
                const ancestorName =
                  a.profiles?.name || a.profiles?.username || a.username;
                const ancestorUserName = a.profiles?.username || a.username;
                const isMe = user?.id === a.user_id;
                const avatarUri = isMe ? profileImageUri : a.profiles?.image_url || undefined;

                return (
                <View key={a.id} style={[styles.post, styles.longReply]}>
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
                    <TouchableOpacity
                      onPress={() =>
                        isMe
                          ? navigation.navigate('Profile')
                          : navigation.navigate('UserProfile', {
                              userId: a.user_id,
                              avatarUrl: avatarUri,
                              bannerUrl: a.profiles?.banner_url,

                              name: ancestorName,
                              username: ancestorUserName,
                            })
                      }
                    >
                      {avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, styles.placeholder]} />
                      )}
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                    <View style={styles.headerRow}>
                      <Text style={styles.username}>
                        {ancestorName} @{ancestorUserName}
                      </Text>
                      <Text style={[styles.timestamp, styles.timestampMargin]}>
                        {timeAgo(a.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.postContent}>{a.content}</Text>
                    {a.image_url && (
                      <Image source={{ uri: a.image_url }} style={styles.postImage} />
                    )}
                  </View>
                </View>
                <View style={styles.replyCountContainer}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={18}
                    color="#66538f"
                    style={{ marginRight: 2 }}
                  />
                  <Text style={styles.replyCountLarge}>{replyCounts[a.id] || 0}</Text>
                </View>
                <LikeInfo id={a.id} />

              </View>
            );
          })}

            <View style={[styles.post, styles.longReply]}>
              {user?.id === parent.user_id && (
                <TouchableOpacity
                  onPress={() => confirmDeleteReply(parent.id)}
                  style={styles.deleteButton}
                >
                  <Text style={{ color: 'white' }}>X</Text>
                </TouchableOpacity>
              )}
              <View style={styles.row}>
                <TouchableOpacity
                  onPress={() =>
                    user?.id === parent.user_id
                      ? navigation.navigate('Profile')
                      : navigation.navigate('UserProfile', {
                          userId: parent.user_id,
                          avatarUrl: parent.profiles?.image_url,
                          bannerUrl: parent.profiles?.banner_url,

                          name,
                          username: parentUserName,
                        })
                  }
                >
                  {user?.id === parent.user_id && profileImageUri ? (
                    <Image source={{ uri: profileImageUri }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.placeholder]} />
                  )}
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <View style={styles.headerRow}>
                    <Text style={styles.username}>
                      {name} @{parentUserName}
                    </Text>
                    <Text style={[styles.timestamp, styles.timestampMargin]}>
                      {timeAgo(parent.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.postContent}>{parent.content}</Text>
                  {parent.image_url && (
                    <Image source={{ uri: parent.image_url }} style={styles.postImage} />
                  )}
                </View>
              </View>
          <View style={styles.replyCountContainer}>
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color="#66538f"
              style={{ marginRight: 2 }}
            />
            <Text style={styles.replyCountLarge}>{replyCounts[parent.id] || 0}</Text>
          </View>
          <LikeInfo id={parent.id} />

          </View>
          </>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        data={replies}
        keyExtractor={item => item.id}

        renderItem={({ item }) => {
          const childName = item.profiles?.name || item.profiles?.username || item.username;
          const childUserName = item.profiles?.username || item.username;
          const isMe = user?.id === item.user_id;
          const avatarUri = isMe ? profileImageUri : item.profiles?.image_url || undefined;

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
              <View style={[styles.reply, styles.longReply]}>
                {isMe && (
                  <TouchableOpacity
                    onPress={() => confirmDeleteReply(item.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={{ color: 'white' }}>X</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.row}>
                  <TouchableOpacity
                    onPress={() =>
                      isMe
                        ? navigation.navigate('Profile')
                        : navigation.navigate('UserProfile', {
                            userId: item.user_id,
                            avatarUrl: avatarUri,
                            bannerUrl: item.profiles?.banner_url,

                            name: childName,
                            username: childUserName,
                          })
                    }
                  >
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.placeholder]} />
                    )}
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <View style={styles.headerRow}>
                      <Text style={styles.username}>
                        {childName} @{childUserName}
                      </Text>
                      <Text style={[styles.timestamp, styles.timestampMargin]}>
                        {timeAgo(item.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.postContent}>{item.content}</Text>
                    {item.image_url && (
                      <Image source={{ uri: item.image_url }} style={styles.postImage} />
                    )}
                  </View>
                </View>
                <View style={styles.replyCountContainer}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={18}
                    color="#66538f"
                    style={{ marginRight: 2 }}
                  />
                  <Text style={styles.replyCountLarge}>{replyCounts[item.id] || 0}</Text>
                </View>
                <LikeInfo id={item.id} />

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
        {replyImage && (
          <Image source={{ uri: replyImage }} style={styles.preview} />
        )}
        <View style={styles.buttonRow}>
          <Button title="Add Image" onPress={pickImage} />
          <Button title="Post" onPress={handleReply} />
        </View>
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
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 8 },
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
  longReply: {
    // add extra space at the bottom so action icons don't overlap content
    paddingBottom: 30,
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
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  timestampMargin: { marginLeft: 6 },
  replyCountContainer: {
    position: 'absolute',
    bottom: 6,
    // Align with the left edge of the post content (text/image)
    // Avatar width (48) + margin (8) + container padding (10)
    left: 66,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyCount: { fontSize: 10, color: 'gray' },
  replyCountLarge: { fontSize: 15, color: 'gray' },
  likeCountLarge: { fontSize: 15, color: 'gray' },
  likedLikeCount: { color: 'red' },
  likeContainer: {
    position: 'absolute',
    bottom: 6,
    left: '50%',
    transform: [{ translateX: -6 }],
    flexDirection: 'row',
    alignItems: 'center',
  },

  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginTop: 8,
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
  
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
});
