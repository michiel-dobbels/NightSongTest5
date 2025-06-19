// ✅ FIXED: HomeScreen.tsx with anti-jitter logic fully restored
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  FlatList,
  Text,
  TextInput,
  StyleSheet,
  Button,
  Alert,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { supabase, POST_BUCKET, POST_VIDEO_BUCKET } from '../../lib/supabase';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../AuthContext';
import { usePostStore } from '../contexts/PostStoreContext';
import { postEvents } from '../postEvents';
import { CONFIRM_ACTION } from '../constants/ui';
import PostCard, { Post } from '../components/PostCard';
import { colors } from '../styles/colors';
import { replyEvents } from '../replyEvents';


export interface HomeScreenRef {
  createPost: (
    content: string,
    image?: string,
    video?: string,
  ) => Promise<void>;
  scrollToTop: () => void;
}


const STORAGE_KEY = 'cached_posts';
const PAGE_SIZE = 10;

const HomeScreen = forwardRef<HomeScreenRef, { hideInput?: boolean }>(
  ({ hideInput }, ref) => {
  const navigation = useNavigation();
  const { user, profile, removePost } = useAuth()!;
  const { remove } = usePostStore();
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const skipNextFetch = useRef(false);
  const listRef = useRef<FlatList>(null);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [replyVideo, setReplyVideo] = useState<string | null>(null);


  if (!user || !profile) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white', padding: 20 }}>Loading...</Text>
      </View>
    );
  }

  const dedupeById = (arr: Post[]): Post[] => {
    const seen = new Set<string>();
    const result: Post[] = [];
    for (const item of arr) {
      if (!seen.has(item.id)) {
        result.push(item);
        seen.add(item.id);
      }
    }
    return result;
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
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      setReplyImage(`data:image/jpeg;base64,${base64}`);
      setReplyVideo(null);
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
      setReplyImage(null);
    }
  };

  const handleReplySubmit = async () => {
    if (!activePostId || (!replyText.trim() && !replyImage && !replyVideo) || !profile) {
      setReplyModalVisible(false);
      return;
    }

    setReplyModalVisible(false);

    setPosts(prev => {
      const updated = prev.map(p =>
        p.id === activePostId
          ? { ...p, reply_count: (p.reply_count ?? 0) + 1 }
          : p,
      );
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    skipNextFetch.current = true;

    let uploadedUrl: string | null = null;
    if (replyVideo) {
      try {
        const ext = replyVideo.split('.').pop() || 'mp4';
        const path = `${profile.id}-${Date.now()}.${ext}`;
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

    const { error } = await supabase.from('replies').insert({
      post_id: activePostId,
      parent_id: null,
      user_id: profile.id,
      content: replyText,
      image_url: replyImage,
      video_url: uploadedUrl,
      username: profile.name || profile.username,
    });
    if (error) {
      console.error('Reply failed', error.message);
    } else {
      replyEvents.emit('replyAdded', activePostId);
    }

    setReplyText('');
    setReplyImage(null);
    setReplyVideo(null);
  };


  const fetchPosts = useCallback(async (offset = 0, append = false) => {
    try {
      if (offset === 0) setLoading(true);

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        setPosts(prev => {
          const prevMap = Object.fromEntries(prev.map(p => [p.id, p.reply_count ?? 0]));
          const combined = append ? [...prev, ...data] : data;
          const merged = combined.map(p => ({
            ...p,
            reply_count: Math.max(p.reply_count ?? 0, prevMap[p.id] ?? 0),
          }));
          const unique = dedupeById(merged);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(unique)).catch(() => {});
          return unique;
        });
      }
    } catch (e) {
      console.error('Failed to fetch posts', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCached = async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    let loadedFromCache = false;

    if (stored) {
      try {
        const cached = JSON.parse(stored);
        setPosts(dedupeById(cached));
        loadedFromCache = true;
      } catch (e) {
        console.error('Failed to parse cached posts', e);
      }
    }

    if (skipNextFetch.current && loadedFromCache) {
      console.log('🛑 Skipped fetchPosts due to local update');
      skipNextFetch.current = false;
      return;
    }

    fetchPosts(0);
  };

  useEffect(() => {
    loadCached();
  }, []);

  useEffect(() => {
    const onReplyAdded = (postId: string) => {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId ? { ...p, reply_count: (p.reply_count ?? 0) + 1 } : p,
        ),
      );
    };
    replyEvents.on('replyAdded', onReplyAdded);
    return () => {
      replyEvents.off('replyAdded', onReplyAdded);
    };
  }, []);

  useEffect(() => {
    const onPostDeleted = (postId: string) => {
      setPosts(prev => prev.filter(p => p.id !== postId));
    };
    postEvents.on('postDeleted', onPostDeleted);
    return () => {
      postEvents.off('postDeleted', onPostDeleted);
    };
  }, []);


  const createPost = async (
    content: string,
    image?: string,
    video?: string,
  ) => {
    if (!content.trim() || !profile) return;

    skipNextFetch.current = true;

    let uploadedImageUrl: string | null = null;
    let uploadedVideoUrl: string | null = null;

    if (image && !image.startsWith('http')) {
      try {
        let ext = 'jpg';
        const dataUriMatch = image.match(/^data:image\/(\w+);/);
        if (dataUriMatch) {
          ext = dataUriMatch[1];
        } else {
          const pathExt = /\.([a-zA-Z0-9]+)$/.exec(image);
          if (pathExt) ext = pathExt[1];
        }
        const path = `${user.id}-${Date.now()}.${ext}`;
        const resp = await fetch(image);
        const blob = await resp.blob();
        const { error: uploadError } = await supabase.storage
          .from(POST_BUCKET)
          .upload(path, blob);
        if (!uploadError) {
          uploadedImageUrl = supabase.storage.from(POST_BUCKET).getPublicUrl(path).data.publicUrl;
        }
      } catch (e) {
        console.error('Image upload failed', e);
      }
    } else if (image) {
      uploadedImageUrl = image;
    }

    if (video && !video.startsWith('http')) {
      try {
        const ext = video.split('.').pop() || 'mp4';
        const path = `${user.id}-${Date.now()}.${ext}`;
        const resp = await fetch(video);
        const blob = await resp.blob();
        const { error: uploadError } = await supabase.storage
          .from(POST_VIDEO_BUCKET)
          .upload(path, blob);
        if (!uploadError) {
          uploadedVideoUrl = supabase.storage
            .from(POST_VIDEO_BUCKET)
            .getPublicUrl(path).data.publicUrl;
        }
      } catch (e) {
        console.error('Video upload failed', e);
      }
    } else if (video) {
      uploadedVideoUrl = video;
    }


    const newPost: Post = {
      id: `temp-${Date.now()}`,
      content,

      user_id: user.id,
      created_at: new Date().toISOString(),
      like_count: 0,
      reply_count: 0,
      username: profile.username,
      image_url: uploadedImageUrl,
      video_url: uploadedVideoUrl,

      profiles: profile,
    };

    setPosts(prev => dedupeById([newPost, ...prev]));


    const { data, error } = await supabase
      .from('posts')
      .insert({
        content,

        user_id: user.id,
        username: profile.username,
        image_url: uploadedImageUrl,
        video_url: uploadedVideoUrl,

      })
      .select()
      .single();

    if (!error && data) {
      setPosts(prev => dedupeById(prev.map(p => (p.id === newPost.id ? data : p))));
    }
  };

  const handlePost = async () => {
    await createPost(postText);
    setPostText('');
  };

  const handleLike = async (postId: string) => {
    skipNextFetch.current = true;
    setPosts(prev =>
      prev.map(p =>
        p.id === postId ? { ...p, like_count: (p.like_count || 0) + 1 } : p
      )
    );
    await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
  };

  const confirmDeletePost = (id: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      CONFIRM_ACTION,
      { text: 'Delete', style: 'destructive', onPress: () => handleDeletePost(id) },
    ]);
  };

  const handleDeletePost = async (id: string) => {
    skipNextFetch.current = true;
    setPosts(prev => prev.filter(p => p.id !== id));
    remove(id);
    await removePost(id);
    await supabase.from('posts').delete().eq('id', id);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  useImperativeHandle(ref, () => ({ createPost, scrollToTop }));


  return (
    <View style={styles.container}>
      {!hideInput && (
        <View>
          <TextInput
            placeholder="What's happening?"
            value={postText}
            onChangeText={setPostText}
            style={styles.input}
          />
          <Button title="Post" onPress={handlePost} />
        </View>
      )}

      {loading && posts.length === 0 ? (
        <ActivityIndicator color="white" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          ref={listRef}

          data={posts}
          keyExtractor={item => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 20 }}
          removeClippedSubviews={false}
          initialNumToRender={10}
          windowSize={5}
          renderItem={({ item }) => {
            const isMe = item.user_id === user.id;
            const avatarUri = isMe
              ? profile?.image_url ?? undefined
              : item.profiles?.image_url ?? undefined;
            const bannerUrl = isMe
              ? profile?.banner_url ?? undefined

              : item.profiles?.banner_url ?? undefined;
            return (
              <PostCard
                post={item}
                isOwner={isMe}
                avatarUri={avatarUri}
                bannerUrl={bannerUrl}
                replyCount={item.reply_count ?? 0}
                onLike={() => handleLike(item.id)}
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
          }}

          onEndReached={() => fetchPosts(posts.length, true)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
        />
      )}
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
            {replyImage && <Image source={{ uri: replyImage }} style={styles.preview} />}
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
  container: { flex: 1, backgroundColor: colors.background, padding: 10 },
  input: {
    backgroundColor: '#111',
    color: '#fff',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
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
