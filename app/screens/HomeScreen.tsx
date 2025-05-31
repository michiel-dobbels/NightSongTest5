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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

const STORAGE_KEY = 'cached_posts';
const COUNT_STORAGE_KEY = 'cached_reply_counts';
const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';


type Post = {
  id: string;
  content: string;
  username?: string;
  user_id: string;
  created_at: string;
  reply_count?: number;
  like_count?: number;
  profiles?: {
    username: string | null;
    display_name: string | null;
  } | null;
};

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

export interface HomeScreenRef {
  createPost: (text: string) => Promise<void>;
}

interface HomeScreenProps {
  hideInput?: boolean;
}

const HomeScreen = forwardRef<HomeScreenRef, HomeScreenProps>(
  ({ hideInput }, ref) => {
    const navigation = useNavigation<any>();
  const { user, profile, profileImageUri } = useAuth() as any;
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});



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
    const { count } = await supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', id);

    if (typeof count === 'number') {
      await supabase.from('posts').update({ like_count: count }).eq('id', id);
      setLikeCounts(prev => {
        const counts = { ...prev, [id]: count };
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




  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(
        'id, content, user_id, created_at, reply_count, like_count, profiles(username, display_name)',
      )
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPosts(data as Post[]);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      const replyEntries = (data as any[]).map(p => [p.id, p.reply_count ?? 0]);
      const replyCountsMap = Object.fromEntries(replyEntries);
      setReplyCounts(replyCountsMap);
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(replyCountsMap));
      const likeEntries = (data as any[]).map(p => [p.id, p.like_count ?? 0]);
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

  const createPost = async (text: string) => {
    if (!text.trim()) return;

    if (!user) return;

    const newPost: Post = {
      id: `temp-${Date.now()}`,
      content: text,
      username: profile.display_name || profile.username,
      user_id: user.id,
      created_at: new Date().toISOString(),
      reply_count: 0,
      like_count: 0,
      profiles: {
        username: profile.username,
        display_name: profile.display_name,
      },
    };

    // Show the post immediately
    setPosts((prev) => {
      const updated = [newPost, ...prev];
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
          username: profile.display_name || profile.username,
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
          const updated = prev.map((p) =>
            p.id === newPost.id
              ? { ...p, id: data.id, created_at: data.created_at, reply_count: 0 }
              : p
          );
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
      fetchPosts();

    } else {
      // Remove the optimistic post if it failed to persist
      setPosts((prev) => {
        const updated = prev.filter((p) => p.id !== newPost.id);
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
          setPosts(cached);
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

      fetchPosts();
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
      fetchPosts();
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
          const displayName =
            item.profiles?.display_name ||
            item.profiles?.username ||
            item.username;
          const userName = item.profiles?.username || item.username;
          const isMe = user?.id === item.user_id;
          const avatarUri = isMe ? profileImageUri : undefined;
          return (
            <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { post: item })}>
              <View style={styles.post}>
                {isMe && (
                  <TouchableOpacity
                    onPress={() => confirmDeletePost(item.id)}
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
                      {displayName} @{userName}
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
                  onPress={() => toggleLike(item.id)}
                >
                  <Ionicons
                    name={likedPosts[item.id] ? 'heart' : 'heart-outline'}

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
    marginBottom: 0,
    borderBottomColor: 'gray',
    borderBottomWidth: StyleSheet.hairlineWidth,

    position: 'relative',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
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

});

export default HomeScreen;
