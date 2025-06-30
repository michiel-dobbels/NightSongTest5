import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PostCard from '../components/PostCard';
import { useStories } from '../contexts/StoryStoreContext';

const PostItem = React.memo(function PostItem({
  item,
  isMe,
  avatarUri,
  bannerUrl,
  imageUrl,
  videoUrl,
  replyCount,
  onPress,
  onAvatarPress,
  onProfilePress,
  onOpenReplies,
}) {
  return (
    <PostCard
      post={item}
      isOwner={isMe}
      avatarUri={avatarUri}
      bannerUrl={bannerUrl}
      imageUrl={imageUrl}
      videoUrl={videoUrl}
      replyCount={replyCount}
      onPress={onPress}
      onAvatarPress={onAvatarPress}
      onProfilePress={onProfilePress}
      onDelete={() => {}}
      onOpenReplies={onOpenReplies}
    />
  );
});
import { colors } from '../styles/colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { usePostStore } from '../contexts/PostStoreContext';
import { getLikeCounts } from '../../lib/getLikeCounts';
import { likeEvents } from '../likeEvents';
import { postEvents } from '../postEvents';

const PAGE_SIZE = 10;

export default function FollowingFeedScreen() {
  const { user, profileImageUri } = useAuth();
  const navigation = useNavigation();
  const { getStoriesForUser } = useStories();
  const { initialize } = usePostStore();
  const [posts, setPosts] = useState([]);
  const [replyCounts, setReplyCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const navigateToProfileOrStory = (targetId, isMe) => {
    const stories = getStoriesForUser(targetId);
    if (stories.length > 0) {
      navigation.navigate('StoryView', { userId: targetId });
    } else {
      if (isMe) navigation.navigate('Profile');
      else navigation.navigate('OtherUserProfile', { userId: targetId });
    }
  };

  const navigateToProfile = (targetId, isMe) => {
    if (isMe) navigation.navigate('Profile');
    else navigation.navigate('OtherUserProfile', { userId: targetId });
  };

  const fetchPosts = useCallback(async (offset = 0, append = false) => {

    if (!user) return;
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
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
        'id, content, image_url, video_url, user_id, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)'

      )
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (!error && data) {
      const slice = data;
      setPosts(prev => {
        const combined = append ? [...prev, ...slice] : slice;
        const seen = new Set();
        return combined.filter(p => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
      });
      setHasMore(slice.length === PAGE_SIZE);
      const counts = {};
      slice.forEach(p => {
        counts[p.id] = p.reply_count ?? 0;
      });
      setReplyCounts(prev => (append ? { ...prev, ...counts } : counts));
      const likeCounts = await getLikeCounts(slice.map(p => p.id));
      initialize(slice.map(p => ({ id: p.id, like_count: likeCounts[p.id] })));
    } else if (error) {
      console.error('Failed to fetch posts', error);
    }
    if (offset === 0) setLoading(false);
    else setLoadingMore(false);
  }, [user?.id, initialize]);


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

  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />}
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        removeClippedSubviews
        initialNumToRender={10}
        windowSize={5}

        onEndReached={() => {
          if (hasMore && !loadingMore) {
            fetchPosts(posts.length, true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 10 }} />
        ) : null}
        renderItem={({ item }) => {
          const isMe = user?.id === item.user_id;
          const avatarUri = isMe ? profileImageUri : item.profiles?.image_url || undefined;
          const bannerUrl = isMe ? undefined : item.profiles?.banner_url || undefined;
          return (
            <PostItem
              item={item}
              isMe={isMe}
              avatarUri={avatarUri}
              bannerUrl={bannerUrl}
              imageUrl={item.image_url || undefined}
              videoUrl={item.video_url || undefined}
              replyCount={replyCounts[item.id] || 0}
              onPress={() => navigation.navigate('PostDetail', { post: item })}
              onAvatarPress={() => navigateToProfileOrStory(item.user_id, isMe)}
              onProfilePress={() => navigateToProfile(item.user_id, isMe)}
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
