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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';
import PostCard from '../components/PostCard';

const STORAGE_KEY = 'cached_posts';
const COUNT_STORAGE_KEY = 'cached_reply_counts';
const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';
const REPLY_STORAGE_PREFIX = 'cached_replies_';
const PAGE_SIZE = 10;


type Post = {
  id: string;
  content: string;
  image_url?: string;
  username?: string;
  user_id: string;
  created_at: string;
  reply_count?: number;
  like_count?: number;
  profiles?: {
    username: string | null;
    name: string | null;
    image_url?: string | null;
    banner_url?: string | null;
  } | null;
};


export interface HomeScreenRef {
  createPost: (text: string, imageUri?: string) => Promise<void>;
}

interface HomeScreenProps {
  hideInput?: boolean;
}

const HomeScreen = forwardRef<HomeScreenRef, HomeScreenProps>(
  ({ hideInput }, ref) => {
    const navigation = useNavigation<any>();
  const { user, profile, profileImageUri, bannerImageUri } = useAuth() as any;
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);



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
    setLikeCounts(prev => {
      const { [id]: _removed, ...rest } = prev;
      AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(rest));
      return rest;
    });
    setLikedPosts(prev => {
      const { [id]: _omit, ...rest } = prev;
      AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user?.id}`, JSON.stringify(rest));
      return rest;
    });
    await supabase.from('posts').delete().eq('id', id);
  };

  const refreshLikeCount = async (id: string) => {
    const { data } = await supabase
      .from('posts')
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

  const toggleLike = async (id: string) => {
    if (!user) return;
    const liked = likedPosts[id];
    setLikedPosts(prev => {
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
      await supabase.from('likes').delete().match({ user_id: user.id, post_id: id });
    } else {
      await supabase.from('likes').insert({ user_id: user.id, post_id: id });

    }
    await refreshLikeCount(id);
  };

  const openReplyModal = (postId: string) => {

    setActivePostId(postId);
    setReplyText('');
    setReplyImage(null);
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

  const handleReplySubmit = async () => {
    if (
      !activePostId ||
      (!replyText.trim() && !replyImage) ||
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

    setLikeCounts(prev => {
      const counts = { ...prev, [newReply.id]: 0 };
      AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
      return counts;
    });

    setReplyText('');
    setReplyImage(null);

    let { data, error } = await supabase
      .from('replies')
      .insert({
        post_id: activePostId,
        parent_id: null,
        user_id: user.id,
        content: replyText,
        image_url: replyImage,
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
      setLikeCounts(prev => {
        const temp = prev[newReply.id] ?? 0;
        const { [newReply.id]: _omit, ...rest } = prev;
        const counts = { ...rest, [data.id]: temp };
        AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
        return counts;
      });
      } else if (error) {
        // Reply insertion sometimes fails if the post has not been
        // assigned a real UUID yet. The optimistic reply will still
        // be visible, so just log the error instead of alerting.
        console.error('Reply failed', error.message);
      }

  };




  const fetchPosts = async (offset = 0, append = false) => {
    const { data, error } = await supabase
      .from('posts')
      .select(
        'id, content, image_url, user_id, created_at, reply_count, like_count, profiles(username, name, image_url, banner_url)',
      )
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (!error && data) {
      const replyEntries = (data as any[]).map(p => [p.id, p.reply_count ?? 0]);
      const likeEntries = (data as any[]).map(p => [p.id, p.like_count ?? 0]);
      const slice = (data as Post[]).slice(0, PAGE_SIZE);
      setPosts(slice);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(slice));

      const replyCountsMap = Object.fromEntries(replyEntries);
      setReplyCounts(replyCountsMap);
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(replyCountsMap));
      const likeMap = Object.fromEntries(likeEntries);
      setLikeCounts(likeMap);
      AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(likeMap));


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
          setLikedPosts(likedObj);
          AsyncStorage.setItem(
            `${LIKED_KEY_PREFIX}${user.id}`,
            JSON.stringify(likedObj),
          );
        }

      }
    }
  };



  const createPost = async (text: string, imageUri?: string) => {
    if (!text.trim() && !imageUri) return;


    if (!user) return;

    const newPost: Post = {
      id: `temp-${Date.now()}`,
      content: text,
      image_url: imageUri,
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
    setLikeCounts(prev => {
      const counts = { ...prev, [newPost.id]: 0 };
      AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
      return counts;
    });

    if (!hideInput) {
      setPostText('');
    }


    let { data, error } = await supabase
      .from('posts')
      .insert([
        {
          content: text,
          user_id: user.id,
          username: profile.name || profile.username,
          image_url: imageUri,
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
                ? { ...p, id: data.id, created_at: data.created_at, reply_count: 0 }
                : p
            )
            .slice(0, PAGE_SIZE);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
        setReplyCounts(prev => {
          const { [newPost.id]: tempCount, ...rest } = prev;
          const counts = { ...rest, [data.id]: tempCount };
          AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
          return counts;
        });
        setLikeCounts(prev => {
          const temp = prev[newPost.id] ?? 0;
          const { [newPost.id]: _omit, ...rest } = prev;
          const counts = { ...rest, [data.id]: temp };
          AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
          return counts;
        });
        setLikeCounts(prev => {
          const { [newPost.id]: tempLike, ...rest } = prev;
          const counts = { ...rest, [data.id]: tempLike ?? 0 };
          AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
          return counts;
        });
      }

      // Refresh from the server in the background to stay in sync
      fetchPosts(0);

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
      setLikeCounts(prev => {
        const { [newPost.id]: _omit, ...rest } = prev;
        AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(rest));
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
    const loadCached = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const cached = JSON.parse(stored);
          setPosts(cached.slice(0, PAGE_SIZE));
          const entries = cached.map((p: any) => [p.id, p.reply_count ?? 0]);
          setReplyCounts(Object.fromEntries(entries));
          const likeEntries = cached.map((p: any) => [p.id, p.like_count ?? 0]);
          setLikeCounts(Object.fromEntries(likeEntries));

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
          setLikeCounts(JSON.parse(likeStored));
        } catch (e) {
          console.error('Failed to parse cached like counts', e);
        }
      }
      if (user) {
        const likedStored = await AsyncStorage.getItem(`${LIKED_KEY_PREFIX}${user.id}`);
        if (likedStored) {
          try {
            setLikedPosts(JSON.parse(likedStored));
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
            setLikeCounts(JSON.parse(likeStored));
          } catch (e) {
            console.error('Failed to parse cached like counts', e);
          }
        }
        if (user) {
          const likedStored = await AsyncStorage.getItem(`${LIKED_KEY_PREFIX}${user.id}`);
          if (likedStored) {
            try {
              setLikedPosts(JSON.parse(likedStored));
            } catch (e) {
              console.error('Failed to parse cached likes', e);
            }

          }
        }
      };
      syncCounts();
      fetchPosts(0);
    }, []),
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
        
        renderItem={({ item }) => {
          const isMe = user?.id === item.user_id;
          const avatarUri = isMe ? profileImageUri : item.profiles?.image_url || undefined;

          return (
            <PostCard
              post={item}
              replyCount={replyCounts[item.id] || 0}
              likeCount={likeCounts[item.id] || 0}
              liked={!!likedPosts[item.id]}
              avatarUri={avatarUri}
              showDelete={isMe}
              onPress={() => navigation.navigate('PostDetail', { post: item })}
              onDelete={() => confirmDeletePost(item.id)}
              onReplyPress={() => openReplyModal(item.id)}
              onToggleLike={() => toggleLike(item.id)}
              onUserPress={() =>
                isMe
                  ? navigation.navigate('Profile')
                  : navigation.navigate('UserProfile', {
                      userId: item.user_id,
                      avatarUrl: avatarUri,
                      bannerUrl: item.profiles?.banner_url,
                      name: item.profiles?.name || item.profiles?.username || item.username,
                      username: item.profiles?.username || item.username,
                    })
              }
            />
          );
        }}
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
            <View style={styles.buttonRow}>
              <Button title="Add Image" onPress={pickReplyImage} />
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
  post: {
    backgroundColor: '#ffffff10',
    borderRadius: 0,
    padding: 10,
    // add extra space at the bottom so action icons don't overlap content
    paddingBottom: 30,
    marginBottom: 0,
    borderBottomColor: 'gray',
    borderBottomWidth: StyleSheet.hairlineWidth,

    position: 'relative',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 8 },
  placeholder: { backgroundColor: '#555' },
  deleteButton: {
    position: 'absolute',
    right: 6,
    top: 6,
    padding: 4,
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

  likeContainer: {
    position: 'absolute',
    bottom: 6,
    left: '50%',
    transform: [{ translateX: -6 }],
    flexDirection: 'row',
    alignItems: 'center',
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
