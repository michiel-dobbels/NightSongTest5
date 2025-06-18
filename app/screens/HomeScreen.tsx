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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { usePostStore } from '../contexts/PostStoreContext';
import { PostCard, Post } from '../components/PostCard';
import { colors } from '../styles/colors';

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
  const { user, profile, updatePost, mergeLiked } = usePostStore();
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const skipNextFetch = useRef(false);
  const listRef = useRef<FlatList>(null);

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
      console.log('🛑 Skipped fetchPosts due to local update');
      skipNextFetch.current = false;
      return;
    }

    fetchPosts(0);
  };

  useEffect(() => {
    loadCached();
  }, []);

  const createPost = async (
    content: string,
    image?: string,
    video?: string,
  ) => {
    if (!content.trim()) return;
    skipNextFetch.current = true;

    const newPost: Post = {
      id: `temp-${Date.now()}`,
      content,
      user_id: user.id,
      created_at: new Date().toISOString(),
      like_count: 0,
      reply_count: 0,
      username: profile.username,
      image_url: image ?? null,
      video_url: video ?? null,
      profiles: profile,
    };

    setPosts(prev => [newPost, ...prev]);

    const { data, error } = await supabase
      .from('posts')
      .insert({
        content,
        user_id: user.id,
        username: profile.username,
        image_url: image ?? null,
        video_url: video ?? null,
      })
      .select()
      .single();

    if (!error && data) {
      setPosts(prev => prev.map(p => (p.id === newPost.id ? data : p)));
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
      )}
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
});

export default HomeScreen;
