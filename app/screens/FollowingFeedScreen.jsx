import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import PostCard from '../components/PostCard';
import { colors } from '../styles/colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { usePostStore } from '../contexts/PostStoreContext';
import { getLikeCounts } from '../../lib/getLikeCounts';
import { likeEvents } from '../likeEvents';
import { postEvents } from '../postEvents';

export default function FollowingFeedScreen() {
  const { user, profileImageUri } = useAuth()!;
  const navigation = useNavigation<any>();
  const { initialize } = usePostStore();
  const [posts, setPosts] = useState([]);
  const [replyCounts, setReplyCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    if (!user) return;
    setLoading(true);
    const { data: followData, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (followError) {
      console.error('Failed to fetch following list', followError);
      setPosts([]);
      setLoading(false);
      return;
    }

    const ids = (followData ?? []).map(f => f.following_id);
    if (ids.length === 0) {
      setPosts([]);
      setReplyCounts({});
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('posts')
      .select(
        'id, content, image_url, user_id, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)'
      )
      .in('user_id', ids)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const unique = [];
      const seen = new Set();
      data.forEach(p => {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          unique.push(p);
        }
      });
      setPosts(unique);
      const counts = {};
      unique.forEach(p => {
        counts[p.id] = p.reply_count ?? 0;
      });
      setReplyCounts(counts);
      const likeCounts = await getLikeCounts(unique.map(p => p.id));
      initialize(unique.map(p => ({ id: p.id, like_count: likeCounts[p.id] })));
    } else if (error) {
      console.error('Failed to fetch posts', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const onLikeChanged = ({ id, count }) => {
      setPosts(prev => prev.map(p => (p.id === id ? { ...p, like_count: count } : p)));
    };
    const onPostDeleted = postId => {
      setPosts(prev => prev.filter(p => p.id !== postId));
      setReplyCounts(prev => {
        const { [postId]: _omit, ...rest } = prev;
        return rest;
      });
    };
    likeEvents.on('likeChanged', onLikeChanged);
    postEvents.on('postDeleted', onPostDeleted);
    return () => {
      likeEvents.off('likeChanged', onLikeChanged);
      postEvents.off('postDeleted', onPostDeleted);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [user?.id])
  );

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator color="white" style={{ marginTop: 20 }} />}
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isMe = user?.id === item.user_id;
          const avatarUri = isMe ? profileImageUri : item.profiles?.image_url || undefined;
          const bannerUrl = isMe ? undefined : item.profiles?.banner_url || undefined;
          return (
            <PostCard
              post={item}
              isOwner={isMe}
              avatarUri={avatarUri}
              bannerUrl={bannerUrl}
              replyCount={replyCounts[item.id] || 0}
              onPress={() => navigation.navigate('PostDetail', { post: item })}
              onProfilePress={() =>
                isMe
                  ? navigation.navigate('Profile')
                  : navigation.navigate('OtherUserProfile', { userId: item.user_id })
              }
              onDelete={() => {}}
              onOpenReplies={() => navigation.navigate('PostDetail', { post: item })}
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
    backgroundColor: colors.background,
  },
});
