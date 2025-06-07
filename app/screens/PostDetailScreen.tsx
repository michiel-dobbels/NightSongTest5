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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';
import { replyEvents } from '../replyEvents';
import PostCard, { Post } from '../components/PostCard';

const REPLY_STORAGE_PREFIX = 'cached_replies_';
const COUNT_STORAGE_KEY = 'cached_reply_counts';
const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';




interface Reply {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;

  username?: string;
  reply_count?: number;
  like_count?: number;
  profiles?: {
    username: string | null;
    name: string | null;
    image_url?: string | null;
    banner_url?: string | null;
  } | null;
}

export default function PostDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, profile, profileImageUri, bannerImageUri } = useAuth() as any;
  const post = route.params.post as Post;
  const fromProfile = route.params?.fromProfile ?? false;

  const STORAGE_KEY = `${REPLY_STORAGE_PREFIX}${post.id}`;

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
    const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
    if (likeStored) {
      try {
        const map = JSON.parse(likeStored);
        delete map[id];
        await AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(map));
      } catch {}
    }
    if (user) {
      const likedStored = await AsyncStorage.getItem(`${LIKED_KEY_PREFIX}${user?.id}`);
      if (likedStored) {
        try {
          const map = JSON.parse(likedStored);
          delete map[id];
          await AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user.id}`, JSON.stringify(map));
        } catch {}
      }
    }
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
            JSON.parse(likeStored);
          } catch (e) {
            console.error('Failed to parse cached like counts', e);
          }
        }
        if (user) {
          const likedStored = await AsyncStorage.getItem(`${LIKED_KEY_PREFIX}${user.id}`);
          if (likedStored) {
            try {
              JSON.parse(likedStored);
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
      .select(
        'id, post_id, parent_id, user_id, content, image_url, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)'
      )


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
      setReplyCounts(prev => {
        const counts = { ...prev };
        all.forEach(r => {
          counts[r.id] = prev[r.id] ?? r.reply_count ?? 0;
        });
        counts[post.id] =
          prev[post.id] ??
          (postData ? postData.reply_count ?? all.length : post.reply_count ?? all.length);
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
        return counts;
      });
      const likeEntries = all.map(r => [r.id, r.like_count ?? 0]);
      const { data: postLike } = await supabase
        .from('posts')
        .select('like_count')
        .eq('id', post.id)
        .single();

      const postLikeCount = postLike ? postLike.like_count ?? 0 : post.like_count ?? 0;
      likeEntries.push([post.id, postLikeCount]);

      const counts = Object.fromEntries(likeEntries) as Record<string, number>;
      AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));

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
          entries.push([post.id, storedCounts[post.id] ?? post.reply_count ?? cached.length]);
          const counts = { ...storedCounts, ...Object.fromEntries(entries) };
          setReplyCounts(counts);
          AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));

          const likeEntries = cached.map((r: any) => [r.id, r.like_count ?? 0]);

          likeEntries.push([post.id, storedLikes[post.id] ?? post.like_count ?? 0]);
          const likeCountsObj = {
            ...Object.fromEntries(likeEntries),
            ...storedLikes,
          } as Record<string, number>;
          AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(likeCountsObj));
        } catch (e) {
          console.error('Failed to parse cached replies', e);
        }
      } else {
        setReplyCounts(storedCounts);
        AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(storedLikes));
      }

      if (user) {
        const likedStored = await AsyncStorage.getItem(
          `${LIKED_KEY_PREFIX}${user.id}`,
        );
        if (likedStored) {
          try {
            JSON.parse(likedStored);
          } catch (e) {
            console.error('Failed to parse cached likes', e);
          }
        }

        const legacyLiked = await AsyncStorage.getItem('LIKE_STATE_KEY');
        if (legacyLiked) {
          try {
            const parsed = JSON.parse(legacyLiked);
            AsyncStorage.setItem(
              `${LIKED_KEY_PREFIX}${user.id}`,
              JSON.stringify(parsed),
            );
          } catch (e) {
            console.error('Failed to parse cached likes', e);
          }
        }
      }

      fetchReplies();
    };

    loadCached();
  }, []);


  const handleReply = async () => {
    if ((!replyText.trim() && !replyImage) || !user) return;

    const newReply: Reply = {
      id: `temp-${Date.now()}`,
      post_id: post.id,
      parent_id: null,
      user_id: user.id,
      content: replyText,
      image_url: replyImage ?? undefined,
      created_at: new Date().toISOString(),
      username: profile.name || profile.username,
      reply_count: 0,
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
        [post.id]: (prev[post.id] || 0) + 1,
        [newReply.id]: 0,
      };

      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
      return counts;
    });
    replyEvents.emit('replyAdded', post.id);
    const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
    const map = likeStored ? JSON.parse(likeStored) : {};
    map[newReply.id] = 0;
    AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(map));
    setReplyText('');
    setReplyImage(null);

    let { data, error } = await supabase

        .from('replies')
        .insert([
          {
            post_id: post.id,
            parent_id: null,
            user_id: user.id,
            content: replyText,
            image_url: replyImage,
            username: profile.name || profile.username,
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
        const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
        const map = likeStored ? JSON.parse(likeStored) : {};
        const temp = map[newReply.id] ?? 0;
        delete map[newReply.id];
        map[data.id] = temp;
        AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(map));

      }

      // Whether or not data was returned, refresh from the server so the reply persists
      fetchReplies();
    } else {
      // Keep the optimistic reply so the user doesn't lose their input
    }
  };

  const displayName = post.profiles?.name || post.profiles?.username || post.username;
  const userName = post.profiles?.username || post.username;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <View style={styles.backButton}>
        <Button
          title="Return"
          onPress={() => (fromProfile ? navigation.navigate('Profile') : navigation.goBack())}
        />
      </View>
      <FlatList
        ListHeaderComponent={() => (
          <PostCard
            post={post}
            isOwner={user?.id === post.user_id}
            avatarUri={
              user?.id === post.user_id ? profileImageUri : post.profiles?.image_url || undefined
            }
            bannerUrl={user?.id === post.user_id ? undefined : post.profiles?.banner_url || undefined}
            replyCount={replyCounts[post.id] || 0}
            onPress={() => {}}
            onProfilePress={() =>
              user?.id === post.user_id
                ? navigation.navigate('Profile')
                : navigation.navigate('UserProfile', {
                    userId: post.user_id,
                    avatarUrl: post.profiles?.image_url,
                    bannerUrl: post.profiles?.banner_url,
                    name: displayName,
                    username: userName,
                  })
            }
            
            onDelete={() => confirmDeletePost(post.id)}
            onOpenReplies={() => {}}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        data={replies}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const name = item.profiles?.name || item.profiles?.username || item.username;
          const replyUserName = item.profiles?.username || item.username;
          const isMe = user?.id === item.user_id;
          const avatarUri = isMe ? profileImageUri : item.profiles?.image_url || undefined;

          return (
            <PostCard
              post={item as Post}
              isOwner={isMe}
              avatarUri={avatarUri}
              bannerUrl={item.profiles?.banner_url || undefined}
              replyCount={replyCounts[item.id] || 0}
              onPress={() =>
                navigation.push('ReplyDetail', {
                  reply: item,
                  originalPost: post,
                  ancestors: [],
                })
              }
              onProfilePress={() =>
                isMe
                  ? navigation.navigate('Profile')
                  : navigation.navigate('UserProfile', {
                      userId: item.user_id,
                      avatarUrl: avatarUri,
                      bannerUrl: item.profiles?.banner_url,
                      name,
                      username: replyUserName,
                    })
              }
              onDelete={() => confirmDeleteReply(item.id)}
              onOpenReplies={() => {}}
            />
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
