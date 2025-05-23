import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import PostItem, { Post } from '../components/PostItem';


export default function HomeScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation();
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);


  

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('id, content, user_id, created_at, profiles(username, display_name)')
      .order('created_at', { ascending: false });

    if (!error && data) setPosts(data as Post[]);
  };

  const handlePost = async () => {
    if (!postText.trim()) return;

    if (!user) return;

    const newPost: Post = {
      id: `temp-${Date.now()}`,
      content: postText,
      username: profile.display_name || profile.username,
      user_id: user.id,
      created_at: new Date().toISOString(),
      profiles: {
        username: profile.username,
        display_name: profile.display_name,
      },
    };

    // Show the post immediately
    setPosts((prev) => [newPost, ...prev]);
    setPostText('');


    let { data, error } = await supabase
      .from('posts')
      .insert([
        {
          content: postText,
          user_id: user.id,
          username: profile.display_name || profile.username,
        },
      ])

      .select()
      .single();

    if (error?.code === 'PGRST204') {

      const retry = await supabase
        .from('posts')
        .insert([
          { content: postText, user_id: user.id },
        ])
        .select()
        .single();
      data = retry.data;
      error = retry.error;

    }

    if (!error && data) {
      // Update the optimistic post with the real data from Supabase
      setPosts((prev) =>
        prev.map((p) =>
          p.id === newPost.id
            ? {
                ...p,
                id: data.id,
                created_at: data.created_at,
              }
            : p
        )
      );

      // Refresh from the server in the background to stay in sync
      fetchPosts();
    } else {
      // Remove the optimistic post if it failed to persist
      setPosts((prev) => prev.filter((p) => p.id !== newPost.id));

      // Log the failure and surface it to the user
      console.error('Failed to post:', error);
      Alert.alert('Post failed', error?.message ?? 'Unable to create post');
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    
    <View style={styles.container}>
      <TextInput
        placeholder="What's happening?"
        value={postText}
        onChangeText={setPostText}
        style={styles.input}
        multiline
      />
      <Button title="Post" onPress={handlePost} />
      
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostItem
            post={item}
            onPress={() => navigation.navigate('PostThread', { rootPost: item, parentPost: item })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#061e45' },
  input: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  // Post item styles are defined in the shared component
});
