import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import PostItem, { Post } from '../components/PostItem';

// Route params definition
interface Params {
  rootPost: Post;
  parentPost: Post;
}

type ThreadRoute = RouteProp<Record<'PostThread', Params>, 'PostThread'>;

export default function PostThreadScreen() {
  const { params } = useRoute<ThreadRoute>();
  const navigation = useNavigation();
  const { user, profile } = useAuth();
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<Post[]>([]);

  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('id, content, user_id, created_at, parent_id, profiles(username, display_name)')
      .eq('parent_id', params.parentPost.id)
      .order('created_at', { ascending: true });

    if (!error && data) setReplies(data as Post[]);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !user) return;

    const newReply: Post = {
      id: `temp-${Date.now()}`,
      content: replyText,
      user_id: user.id,
      created_at: new Date().toISOString(),
      username: profile.display_name || profile.username,
      profiles: {
        username: profile.username,
        display_name: profile.display_name,
      },
    };

    setReplies((prev) => [...prev, newReply]);
    setReplyText('');

    let { data, error } = await supabase
      .from('posts')
      .insert([
        {
          content: replyText,
          user_id: user.id,
          username: profile.display_name || profile.username,
          parent_id: params.parentPost.id,
        },
      ])
      .select()
      .single();

    if (error?.code === 'PGRST204') {
      const retry = await supabase
        .from('posts')
        .insert([{ content: replyText, user_id: user.id, parent_id: params.parentPost.id }])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (!error && data) {
      setReplies((prev) =>
        prev.map((p) =>
          p.id === newReply.id
            ? { ...p, id: data.id, created_at: data.created_at }
            : p
        )
      );
      fetchReplies();
    } else {
      setReplies((prev) => prev.filter((p) => p.id !== newReply.id));
      console.error('Failed to reply:', error);
      Alert.alert('Reply failed', error?.message ?? 'Unable to reply');
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [params.parentPost.id]);

  return (
    <View style={styles.container}>
      <PostItem post={params.rootPost} onPress={() => {}} />
      {params.parentPost.id !== params.rootPost.id && (
        <PostItem post={params.parentPost} onPress={() => {}} />
      )}
      <FlatList
        data={replies}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostItem
            post={item}
            onPress={() =>
              navigation.push('PostThread', {
                rootPost: params.rootPost,
                parentPost: item,
              })
            }
          />
        )}
        ListHeaderComponent={
          <View style={{ marginBottom: 10 }}>
            <TextInput
              placeholder="Reply"
              value={replyText}
              onChangeText={setReplyText}
              style={styles.input}
              multiline
            />
            <Button title="Post reply" onPress={handleReply} />
          </View>
        }
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
});
