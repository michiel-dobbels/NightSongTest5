import React, { useCallback, useState } from 'react';
import { FlatList } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import PostCard from './PostCard';
import { Post } from '../types/Post';
import { useAuth } from '../../AuthContext';

const COUNT_STORAGE_KEY = 'cached_reply_counts';
const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';

interface UserPostsProps {
  userId: string;
}

export default function UserPosts({ userId }: UserPostsProps) {
  const navigation = useNavigation<any>();
  const { user, profile, profileImageUri } = useAuth() as any;

  const [posts, setPosts] = useState<Post[]>([]);
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(
        'id, content, image_url, user_id, created_at, reply_count, like_count, profiles(username, name, image_url, banner_url)'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      const arr = data as Post[];
      setPosts(arr);
      const replies = Object.fromEntries(arr.map(p => [p.id, p.reply_count ?? 0]));
      const likes = Object.fromEntries(arr.map(p => [p.id, p.like_count ?? 0]));
      setReplyCounts(replies);
      setLikeCounts(likes);
      const storedCounts = await AsyncStorage.getItem(COUNT_STORAGE_KEY);
      const storedLikes = await AsyncStorage.getItem(LIKE_COUNT_KEY);
      const counts = storedCounts ? { ...JSON.parse(storedCounts), ...replies } : replies;
      const likeMap = storedLikes ? { ...JSON.parse(storedLikes), ...likes } : likes;
      await AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
      await AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(likeMap));
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
          AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user.id}`, JSON.stringify(likedObj));
        }
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [userId])
  );

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
      AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user.id}`, JSON.stringify(updated));
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

  return (
    <FlatList
      data={posts}
      keyExtractor={item => item.id}
      renderItem={({ item }) => {
        const isMe = user?.id === item.user_id;
        const avatarUri = isMe ? profileImageUri ?? null : item.profiles?.image_url || null;
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
            onLike={() => toggleLike(item.id)}
            onReply={() => navigation.navigate('PostDetail', { post: item })}
            liked={likedPosts[item.id]}
            likeCount={likeCounts[item.id] || 0}
            replyCount={replyCounts[item.id] || 0}
          />
        );
      }}
    />
  );
}
