// ✅ CLEANED VERSION: HomeScreen.tsx with global refresh suppression
import React, {
  useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle,
} from 'react';
import {
  View,
  FlatList,
  Text,
  TextInput,
  StyleSheet,
  Button,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { usePostStore } from '../contexts/PostStoreContext';
import { PostCard, Post } from '../components/PostCard';

const STORAGE_KEY = 'cached_posts';
const COUNT_STORAGE_KEY = 'cached_reply_counts';
const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';
const REPLY_STORAGE_PREFIX = 'cached_replies_';
const PAGE_SIZE = 10;

const HomeScreen = forwardRef(({ hideInput }, ref) => {
  const navigation = useNavigation();
  const { user, profile, updatePost, mergeLiked } = usePostStore();
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const skipNextFetch = useRef(false); // ✅ global suppression flag
    if (!user) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white', padding: 20 }}>Loading...</Text>
      </View>
    );
  }

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
        setPosts(prev => append ? [...prev, ...data] : data);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.error('Failed to fetch posts', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLike = async (postId: string) => {
    skipNextFetch.current = true; // ✅ suppress fetch overwrite
    setPosts(prev =>
      prev.map(p =>
        p.id === postId ? { ...p, like_count: (p.like_count || 0) + 1 } : p
      )
    );
    await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
  };

  useEffect(() => {
    const loadCached = async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    let loadedFromCache = false;

    if (stored) {
      try {
        const cached = JSON.parse(stored);
        setPosts(cached);
        loadedFromCache = true;
      } catch (e) {
        console.error('Failed to parse cached posts', e);
      }
    }

    if (skipNextFetch.current && loadedFromCache) {
      console.log('🛑 Skipped fetchPosts due to local update with valid cache');
      skipNextFetch.current = false;
      return;
    }

    fetchPosts(0);
  };


    loadCached();
  }, []);

  const handlePost = async () => {
    if (!postText.trim()) return;
    skipNextFetch.current = true;

    const newPost: Post = {
      id: `temp-${Date.now()}`,
      content: postText,
      user_id: user.id,
      created_at: new Date().toISOString(),
      like_count: 0,
      reply_count: 0,
      username: profile.username,
      image_url: null,
      video_url: null,
      profiles: profile,
    };

    setPosts(prev => [newPost, ...prev]);
    setPostText('');

    const { data, error } = await supabase.from('posts').insert({
      content: postText,
      user_id: user.id,
      username: profile.username,
    }).select().single();

    if (!error && data) {
      setPosts(prev => prev.map(p => (p.id === newPost.id ? data : p)));
    }
  };

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

      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            isOwner={item.user_id === user.id}
            onLike={() => handleLike(item.id)}
            onPress={() => navigation.navigate('PostDetail', { post: item })}
          />
        )}
        onEndReached={() => fetchPosts(posts.length, true)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 10 },
  input: {
    backgroundColor: '#111',
    color: '#fff',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
});

export default HomeScreen;
