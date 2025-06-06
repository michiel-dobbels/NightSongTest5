import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Button } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';
import PostCard from '../components/PostCard';
import { Post } from '../types/Post';
import { useAuth } from '../../AuthContext';

export default function UserPostsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId } = route.params as { userId: string };
  const { user, profile } = useAuth() as any;
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id, content, image_url, user_id, created_at, reply_count, like_count, profiles(username, name, image_url, banner_url)'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setPosts(data as any);
      }
    };
    fetchPosts();
  }, [userId]);

  return (
    <View style={styles.container}>
      <View style={styles.backButton}>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isMe = user?.id === item.user_id;
          const avatarUri = isMe ? profile?.image_url ?? null : item.profiles?.image_url || null;
          const displayName = item.profiles?.name || item.profiles?.username || item.username;
          const usernameDisplay = item.profiles?.username || item.username;
          return (
            <PostCard
              post={item}
              isCurrentUser={isMe}
              avatarUri={avatarUri}
              onPress={() => navigation.navigate('PostDetail', { post: item })}
              onPressAvatar={() => {
                if (isMe) {
                  navigation.navigate('Profile');
                } else {
                  navigation.navigate('UserProfile', {
                    userId: item.user_id,
                    avatarUrl: avatarUri,
                    bannerUrl: item.profiles?.banner_url,
                    name: displayName,
                    username: usernameDisplay,
                  });
                }
              }}
              onDelete={() => {}}
              onReply={() => {}}
              onLike={() => {}}
              likeCount={item.like_count || 0}
              replyCount={item.reply_count || 0}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
});
