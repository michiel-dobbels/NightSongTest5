import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { getLikeCounts } from '../../lib/getLikeCounts';
import { useAuth } from '../../AuthContext';
import { usePostStore } from '../contexts/PostStoreContext';
import { colors } from '../styles/colors';
import { replyEvents } from '../replyEvents';
import { postEvents } from '../postEvents';
import { likeEvents } from '../likeEvents';
import { CONFIRM_ACTION } from '../constants/ui';

import PostCard, { Post } from '../components/PostCard';

interface PostItemProps {
  item: Post;
  isMe: boolean;
  avatarUri?: string;
  bannerUrl?: string;
  replyCount: number;
  onPress: () => void;
  onProfilePress: () => void;
  onDelete: () => void;
  onOpenReplies: () => void;
}

const PostItem = React.memo(function PostItem({
  item,
  isMe,
  avatarUri,
  bannerUrl,
  replyCount,
  onPress,
  onProfilePress,
  onDelete,
  onOpenReplies,
}: PostItemProps) {
  return (
    <PostCard
      post={item}
      isOwner={isMe}
      avatarUri={avatarUri}
      bannerUrl={bannerUrl}
      replyCount={replyCount}
      onPress={onPress}
      onProfilePress={onProfilePress}
      onDelete={onDelete}
      onOpenReplies={onOpenReplies}
    />
  );
});

const STORAGE_KEY = 'cached_posts';
const COUNT_STORAGE_KEY = 'cached_reply_counts';
const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';
const REPLY_STORAGE_PREFIX = 'cached_replies_';
const PAGE_SIZE = 10;



export interface HomeScreenRef {
  createPost: (text: string, imageUri?: string, videoUri?: string) => Promise<void>;
}

interface HomeScreenProps {
  hideInput?: boolean;
}

const HomeScreen = forwardRef<HomeScreenRef, HomeScreenProps>(
  ({ hideInput }, ref) => {
    const navigation = useNavigation<any>();
    const {
      user,
      profile,
      profileImageUri,
      bannerImageUri,
      addPost,
      updatePost,
      removePost,
    } = useAuth()!;
  const { initialize, mergeLiked, remove } = usePostStore();
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [replyVideo, setReplyVideo] = useState<string | null>(null);


  const renderItem = useCallback(
    ({ item }: { item: Post }) => {
      const isMe = user?.id === item.user_id;
      const avatarUri = isMe ? profileImageUri : item.profiles?.image_url || undefined;
      const bannerUrl = isMe ? undefined : item.profiles?.banner_url || undefined;

      return (
        <PostItem
          item={item}
          isMe={isMe}
          avatarUri={avatarUri}
          bannerUrl={bannerUrl}
          replyCount={replyCounts[item.id] || 0}
          onPress={() => navigation.navigate('PostDetail', { post: item })}
          onProfilePress={() =>
            isMe
              ? navigation.navigate('Profile')
              : navigation.navigate('OtherUserProfile', { userId: item.user_id })
          }
          onDelete={() => confirmDeletePost(item.id)}
          onOpenReplies={() => openReplyModal(item.id)}
        />
      );
    },
    [replyCounts, navigation, profileImageUri, user?.id],
  );

  const confirmDeletePost = (id: string) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      CONFIRM_ACTION,
      { text: "Delete", style: "destructive", onPress: () => handleDeletePost(id) }
    ]);
  };


  const handleDeletePost = async (id: string) => {
    setPosts(prev => {
      const updated = prev.filter(p => p.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setReplyCounts(prev => {
      const { [id]: _removed, ...rest } = prev;
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(rest));
      return rest;
    });
    remove(id);
    await supabase.from('posts').delete().eq('id', id);
    await removePost(id);
  };



  const openReplyModal = (postId: string) => {

    setActivePostId(postId);
    setReplyText('');
    setReplyImage(null);
    setReplyVideo(null);
    setReplyModalVisible(true);
  };

  const pickReplyImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      setReplyImage(`data:image/jpeg;base64,${base64}`);
    }
  };

  const pickReplyVideo = async () => {
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

  const handleReplySubmit = async () => {
    if (
      !activePostId ||
      (!replyText.trim() && !replyImage && !replyVideo) ||
      !user
    ) {

      setReplyModalVisible(false);
      return;
    }

    setReplyModalVisible(false);

    const newReply = {
      id: `temp-${Date.now()}`,
      post_id: activePostId,
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
    } as const;

    const storageKey = `${REPLY_STORAGE_PREFIX}${activePostId}`;
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      const cached = stored ? JSON.parse(stored) : [];
      const updated = [newReply, ...cached];
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to cache reply', e);
    }

    setReplyCounts(prev => {
      const counts = { ...prev, [activePostId]: (prev[activePostId] || 0) + 1, [newReply.id]: 0 };
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
      return counts;
    });
    initialize([{ id: newReply.id, like_count: 0 }]);


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
          uploadedUrl = supabase.storage.from('reply-videos').getPublicUrl(path).data.publicUrl;
        }
      } catch (e) {
        console.error('Video upload failed', e);
      }
    }

    let { data, error } = await supabase
      .from('replies')
      .insert({
        post_id: activePostId,
        parent_id: null,
        user_id: user.id,
        content: replyText,
        image_url: replyImage,
        video_url: uploadedUrl,
        username: profile.name || profile.username,
      })
      .select()
      .single();
    if (error?.code === 'PGRST204') {
      error = null;
    }

    if (!error && data) {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        const cached = stored ? JSON.parse(stored) : [];
        const updated = cached.map((r: any) =>
          r.id === newReply.id ? { ...r, id: data.id, created_at: data.created_at } : r,
        );
        await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update cached reply', e);
      }
      setReplyCounts(prev => {
        const temp = prev[newReply.id] ?? 0;
        const { [newReply.id]: _omit, ...rest } = prev;
        const counts = { ...rest, [data.id]: temp };
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
        return counts;
      });
      initialize([{ id: data.id, like_count: 0 }]);

      } else if (error) {
        // Reply insertion sometimes fails if the post has not been
        // assigned a real UUID yet. The optimistic reply will still
        // be visible, so just log the error instead of alerting.
        console.error('Reply failed', error.message);
      }

  };




  const fetchPosts = useCallback(async (offset = 0, append = false) => {
    const { data, error } = await supabase
      .from('posts')
      .select(
        'id, content, image_url, video_url, user_id, created_at, reply_count, like_count, profiles(username, name, image_url, banner_url)'
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (!error && data) {
      const replyEntries = (data as any[]).map(p => [p.id, p.reply_count ?? 0]);
      const slice = data as Post[];

      setPosts(prev => {
        const temps = prev.filter(p => p.id.startsWith('temp-'));
        const merged = append ? [...prev, ...slice] : [...temps, ...slice];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
      setHasMore(slice.length === PAGE_SIZE);

      const replyCountsMap = Object.fromEntries(replyEntries);
      setReplyCounts(prev => {
        const merged: { [key: string]: number } = { ...prev };
        for (const [id, count] of Object.entries(replyCountsMap)) {
          merged[id] = Math.max(prev[id] ?? 0, count);
        }
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
      const likeCounts = await getLikeCounts(slice.map(p => p.id));
      initialize(
        slice.map(p => ({ id: p.id, like_count: likeCounts[p.id] })),
      );
      slice.forEach(p => {
        if (user && p.user_id === user.id) {
          updatePost(p.id, { like_count: likeCounts[p.id] });
        }
      });



      if (user) {
        const { data: likedData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id)
          .is('reply_id', null);
        if (likedData) {
          const likedObj: { [key: string]: boolean } = {};
          likedData.forEach(l => {
            if (l.post_id) likedObj[l.post_id] = true;
          });
          AsyncStorage.setItem(
            `${LIKED_KEY_PREFIX}${user.id}`,
            JSON.stringify(likedObj),
          );
          mergeLiked(likedObj);
        }

      }
    }
  }, [user?.id, initialize, mergeLiked, updatePost]);



  const createPost = async (text: string, imageUri?: string, videoUri?: string) => {
    if (!text.trim() && !imageUri && !videoUri) return;


    if (!user) return;

    const newPost: Post = {
      id: `temp-${Date.now()}`,
      content: text,
      image_url: imageUri,
      video_url: videoUri ?? undefined,
      username: profile.name || profile.username,
      user_id: user.id,
      created_at: new Date().toISOString(),
      reply_count: 0,
      like_count: 0,
      profiles: {
        username: profile.username,
        name: profile.name,
        image_url: profileImageUri,
        banner_url: bannerImageUri,
      },
    };

    // Show the post immediately
    setPosts((prev) => {
      const updated = [newPost, ...prev].slice(0, PAGE_SIZE);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setReplyCounts(prev => {
      const counts = { ...prev, [newPost.id]: 0 };
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
      return counts;
    });
    initialize([{ id: newPost.id, like_count: 0 }]);


    // Cache the new post for the profile screen as well
    addPost({
      id: newPost.id,
      content: text,
      created_at: newPost.created_at,
      image_url: imageUri,
      video_url: videoUri ?? undefined,
      username: profile.name || profile.username,
    });

    if (!hideInput) {
      setPostText('');
    }


    let uploadedVideoUrl: string | null = null;
    if (videoUri) {
      try {
        const ext = videoUri.split('.').pop() || 'mp4';
        const path = `${user.id}-${Date.now()}.${ext}`;
        const resp = await fetch(videoUri);
        const blob = await resp.blob();
        const { error: uploadError } = await supabase.storage
          .from('post-videos')
          .upload(path, blob);
        if (!uploadError) {
          uploadedVideoUrl = supabase.storage
            .from('post-videos')
            .getPublicUrl(path).data.publicUrl;
        }
      } catch (e) {
        console.error('Video upload failed', e);
      }
    }

    let { data, error } = await supabase
      .from('posts')
      .insert([
        {
          content: text,
          user_id: user.id,
          username: profile.name || profile.username,
          image_url: imageUri,
          video_url: uploadedVideoUrl,
        },
      ])

      .select()
      .single();

    if (error?.code === 'PGRST204') {
      // Insert succeeded but no row was returned. Don't retry; rely on the
      // subsequent fetch to load the new post from the server.
      error = null;
    }

    if (!error) {
      if (data) {
        // Update the optimistic post with the real data from Supabase
        setPosts((prev) => {
          const updated = prev
            .map((p) =>
              p.id === newPost.id
                ? {
                    ...p,
                    id: data.id,
                    created_at: data.created_at,
                    reply_count: 0,
                    video_url: data.video_url,
                    image_url: data.image_url,
                  }
                : p
            )
            .slice(0, PAGE_SIZE);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
        // Update cached profile posts with the real data
        updatePost(newPost.id, {
          id: data.id,
          content: data.content,
          created_at: data.created_at,
          image_url: data.image_url,
          video_url: data.video_url,
          username: data.username,
        });
        setReplyCounts(prev => {
          const { [newPost.id]: tempCount, ...rest } = prev;
          const counts = { ...rest, [data.id]: tempCount };
          AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
          return counts;
        });
        initialize([{ id: data.id, like_count: 0 }]);

      }

      // Refresh from the server in the background to keep the feed up to date
      setTimeout(() => fetchPosts(0), 2000);


    } else {
      // Remove the optimistic post if it failed to persist
      setPosts((prev) => {
        const updated = prev.filter((p) => p.id !== newPost.id).slice(0, PAGE_SIZE);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      setReplyCounts(prev => {
        const { [newPost.id]: _omit, ...rest } = prev;
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(rest));
        return rest;
      });

      // Log the failure and surface it to the user
      console.error('Failed to post:', error?.message);
      Alert.alert('Post failed', error?.message ?? 'Unable to create post');
    }
  };

  const handlePost = () => createPost(postText);

  useImperativeHandle(ref, () => ({
    createPost,
  }));

  useEffect(() => {
    const onReplyAdded = (postId: string) => {
      setReplyCounts(prev => {
        const updated = { ...prev, [postId]: (prev[postId] || 0) + 1 };
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    };
    replyEvents.on('replyAdded', onReplyAdded);
    return () => {
      replyEvents.off('replyAdded', onReplyAdded);
    };
  }, []);

  useEffect(() => {
    const onPostDeleted = (postId: string) => {
      setPosts(prev => {
        const updated = prev.filter(p => p.id !== postId);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      setReplyCounts(prev => {
        const { [postId]: _omit, ...rest } = prev;
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(rest));
        return rest;
      });

    };
    postEvents.on('postDeleted', onPostDeleted);
    return () => {
      postEvents.off('postDeleted', onPostDeleted);
    };
  }, []);

  useEffect(() => {
    const onLikeChanged = ({ id, count }: { id: string; count: number }) => {
      setPosts(prev => {
        const updated = prev.map(p => (p.id === id ? { ...p, like_count: count } : p));
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    };
    likeEvents.on('likeChanged', onLikeChanged);
    return () => {
      likeEvents.off('likeChanged', onLikeChanged);
    };
  }, []);

  useEffect(() => {

    const loadCached = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const cached = JSON.parse(stored);
          setPosts(cached.slice(0, PAGE_SIZE));
          const entries = cached.map((p: any) => [p.id, p.reply_count ?? 0]);
          setReplyCounts(Object.fromEntries(entries));
      const likeEntries = cached.map((p: any) => [p.id, p.like_count ?? 0]);
      const likeMap = Object.fromEntries(likeEntries);
      initialize(cached.map((p: any) => ({ id: p.id, like_count: p.like_count ?? 0 }))); 


        } catch (e) {
          console.error('Failed to parse cached posts', e);
        }
      }
      const countStored = await AsyncStorage.getItem(COUNT_STORAGE_KEY);
      if (countStored) {
        try {
          setReplyCounts(JSON.parse(countStored));
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
            const map = JSON.parse(likedStored);
            mergeLiked(map);
          } catch (e) {
            console.error('Failed to parse cached likes', e);
          }

        }
      }

      fetchPosts(0);
    };

    loadCached();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const syncCounts = async () => {
        const stored = await AsyncStorage.getItem(COUNT_STORAGE_KEY);
        if (stored) {
          try {
            setReplyCounts(JSON.parse(stored));
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
              const map = JSON.parse(likedStored);
              mergeLiked(map);
            } catch (e) {
              console.error('Failed to parse cached likes', e);
            }

          }
        }
      };
      syncCounts();
      fetchPosts(0);
    }, [fetchPosts]),
  );

  return (
    
    <View style={styles.container}>
      {!hideInput && (
        <>
          <TextInput
            placeholder="What's happening?"
            value={postText}
            onChangeText={setPostText}
            style={styles.input}
            multiline
          />
          <Button title="Post" onPress={handlePost} />
        </>
      )}
      
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        initialNumToRender={10}
        windowSize={5}
        onEndReached={() => {
          if (hasMore && !loadingMore) {
            setLoadingMore(true);
            fetchPosts(posts.length, true).finally(() => setLoadingMore(false));
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator color="white" style={{ marginVertical: 10 }} />
        ) : null}
        renderItem={renderItem}
      />
      <Modal visible={replyModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
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
              <Button title="Add Image" onPress={pickReplyImage} />
              <Button title="Add Video" onPress={pickReplyVideo} />
              <Button title="Post" onPress={handleReplySubmit} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
    backgroundColor: colors.background,
  },
  input: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    padding: 20,
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

export default HomeScreen;
