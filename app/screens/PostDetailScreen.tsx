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
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { getLikeCounts } from '../../lib/getLikeCounts';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';
import { replyEvents } from '../replyEvents';
import { usePostStore } from '../contexts/PostStoreContext';
import { postEvents } from '../postEvents';
import PostCard, { Post } from '../components/PostCard';
import { CONFIRM_ACTION } from '../constants/ui';

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
  const {
    user,
    profile,
    profileImageUri,
    bannerImageUri,
    removePost,
  } = useAuth()!;
  const { initialize, remove } = usePostStore();
  const post = route.params.post as Post;
  const fromProfile = route.params?.fromProfile ?? false;

  const STORAGE_KEY = `${REPLY_STORAGE_PREFIX}${post.id}`;

  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [replyVideo, setReplyVideo] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [allReplies, setAllReplies] = useState<Reply[]>([]);
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});

  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const confirmDeletePost = (id: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      CONFIRM_ACTION,
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

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const info = await FileSystem.getInfoAsync(uri);
      if (info.size && info.size > 20 * 1024 * 1024) {
        Alert.alert('Video too large', 'Please select a video under 20MB.');
        return;
      }
      setReplyVideo(uri);
    }
  };

  const handleDeletePost = async (id: string) => {
    remove(id);
    await removePost(id);
    await supabase.from('posts').delete().eq('id', id);

    navigation.goBack();
  };


  const confirmDeleteReply = (id: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      CONFIRM_ACTION,
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

    await supabase.from('replies').delete().eq('id', id);
    remove(id);
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

  const refreshCounts = useCallback(async () => {
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
        const parsed = JSON.parse(likeStored);
        initialize(
          Object.entries(parsed).map(([id, c]) => ({
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
          JSON.parse(likedStored);
        } catch (e) {
          console.error('Failed to parse cached likes', e);
        }

      }
    }
  }, [initialize, user?.id]);

  const fetchReplies = useCallback(async () => {
    const { data, error } = await supabase
      .from('replies')
      .select(
        'id, post_id, parent_id, user_id, content, image_url, video_url, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)'
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
      const ids = [post.id, ...all.map(r => r.id)];
      const likeCounts = await getLikeCounts(ids);
      initialize(ids.map(id => ({ id, like_count: likeCounts[id] })));



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
  }, [post.id, initialize, user?.id]);

  useEffect(() => {
    refreshCounts();
    fetchReplies();
  }, [refreshCounts, fetchReplies]);

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

          const likeEntries = cached.map((r: any) => [r.id, storedLikes[r.id] ?? r.like_count ?? 0]);

          likeEntries.push([post.id, storedLikes[post.id] ?? post.like_count ?? 0]);
          const likeCountsObj = {
            ...Object.fromEntries(likeEntries),
            ...storedLikes,
          } as Record<string, number>;
          initialize([
            { id: post.id, like_count: likeCountsObj[post.id] ?? 0 },
            ...cached.map((r: any) => ({ id: r.id, like_count: likeCountsObj[r.id] ?? 0 })),
          ]);
        } catch (e) {
          console.error('Failed to parse cached replies', e);
        }
      } else {
        setReplyCounts(storedCounts);
        const items = Object.keys(storedLikes).length
          ? Object.entries(storedLikes).map(([id, c]) => ({
              id,
              like_count: c as number,
            }))
          : [
              {
                id: post.id,
                like_count: storedLikes[post.id] ?? post.like_count ?? 0,
              },
            ];
        initialize(items);


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
    if ((!replyText.trim() && !replyImage && !replyVideo) || !user) return;

    const newReply: Reply = {
      id: `temp-${Date.now()}`,
      post_id: post.id,
      parent_id: null,
      user_id: user.id,
      content: replyText,
      image_url: replyImage ?? undefined,
      video_url: replyVideo ?? undefined,
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
    initialize([{ id: newReply.id, like_count: 0 }]);
    replyEvents.emit('replyAdded', post.id);
    setReplyText('');
    setReplyImage(null);
    setReplyVideo(null);

    let uploadedUrl = null;
    if (replyVideo) {
      try {
        const ext = replyVideo.split('.').pop() || 'mp4';
        const path = `${user.id}-${Date.now()}.${ext}`;
        const resp = await fetch(replyVideo);
        const blob = await resp.blob();
        const { error: uploadError } = await supabase.storage
          .from('reply-videos')
          .upload(path, blob);
        if (!uploadError) {
          uploadedUrl = supabase.storage.from('reply-videos').getPublicUrl(path).data.publicURL;
        }
      } catch (e) {
        console.error('Video upload failed', e);
      }
    }

    let { data, error } = await supabase

        .from('replies')
        .insert([
          {
            post_id: post.id,
            parent_id: null,
            user_id: user.id,
            content: replyText,
            image_url: replyImage,
            video_url: uploadedUrl,
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
        initialize([{ id: data.id, like_count: 0 }]);


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
                : navigation.navigate('OtherUserProfile', {
                    userId: post.user_id,
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
                  : navigation.navigate('OtherUserProfile', {
                      userId: item.user_id,
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
        {!replyImage && replyVideo && (
          <Video
            source={{ uri: replyVideo }}
            style={styles.preview}
            useNativeControls
            isMuted
            resizeMode="contain"
          />
        )}
        <View style={styles.buttonRow}>
          <Button title="Add Image" onPress={pickImage} />
          <Button title="Add Video" onPress={pickVideo} />
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
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    color: colors.text,
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
