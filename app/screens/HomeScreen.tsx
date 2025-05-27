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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

const STORAGE_KEY = 'cached_posts';

type Post = {
  id: string;
  content: string;
  username?: string;
  user_id: string;
  created_at: string;
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
    const { user, profile } = useAuth();
    const [postText, setPostText] = useState('');
    const [posts, setPosts] = useState<Post[]>([]);




  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('id, content, user_id, created_at, profiles(username, display_name)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPosts(data as Post[]);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
              ? { ...p, id: data.id, created_at: data.created_at }
              : p
          );
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
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

      // Log the failure and surface it to the user
      console.error('Failed to post:', error?.message);
      Alert.alert('Post failed', error?.message ?? 'Unable to create post');
    }
  };

  const handleDeletePost = async (id: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) {
      Alert.alert('Delete failed', error.message);
    }
    setPosts(prev => {
      const updated = prev.filter(p => p.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const confirmDeletePost = (id: string) => {
    Alert.alert('Delete post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeletePost(id) },
    ]);
  };

  const handlePost = () => createPost(postText);

  const deletePost = async (postId: string) => {
    setPosts(prev => {
      const updated = prev.filter(p => p.id !== postId);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    await supabase.from('posts').delete().eq('id', postId);
  };

  const confirmDelete = (postId: string) => {
    Alert.alert('Delete post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: () => deletePost(postId) },
    ]);
  };

  useImperativeHandle(ref, () => ({
    createPost,
  }));

  useEffect(() => {
    const loadCached = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setPosts(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse cached posts', e);
        }
      }

      fetchPosts();
    };

    loadCached();
  }, []);

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
          return (
            <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { post: item })}>
              <View style={styles.post}>
                {item.user_id === user?.id && (
                  <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDeletePost(item.id)}>
                    <Text style={styles.deleteText}>X</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.username}>@{displayName}</Text>
                <Text style={styles.postContent}>{item.content}</Text>
                <Text style={styles.timestamp}>{timeAgo(item.created_at)}</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  deleteText: { color: 'white', fontWeight: 'bold' },
  postContent: { color: 'white' },
  username: { fontWeight: 'bold', color: 'white' },
  timestamp: { fontSize: 10, color: 'gray' },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  deleteText: { color: 'red', fontWeight: 'bold' },
});

export default HomeScreen;
