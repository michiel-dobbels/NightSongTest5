import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';

const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';

export function useLike(id: string, isReply: boolean = false) {
  const { user } = useAuth() as any;
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
        if (likeStored) {
          const map = JSON.parse(likeStored);
          if (map[id] !== undefined) setLikeCount(map[id]);
        }
      } catch (e) {
        console.error('Failed to load like counts', e);
      }
      if (user) {
        try {
          const likedStored = await AsyncStorage.getItem(
            `${LIKED_KEY_PREFIX}${user.id}`,
          );
          if (likedStored) {
            const map = JSON.parse(likedStored);
            setLiked(!!map[id]);
          }
        } catch (e) {
          console.error('Failed to load liked state', e);
        }
      } else {
        setLiked(false);
      }
    };
    load();
  }, [id, user]);

  const refreshLikeCount = async () => {
    const { count } = await supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .match(isReply ? { reply_id: id } : { post_id: id });
    if (typeof count === 'number') {
      await supabase
        .from(isReply ? 'replies' : 'posts')
        .update({ like_count: count })
        .eq('id', id);
      setLikeCount(count);
      try {
        const stored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
        const map = stored ? JSON.parse(stored) : {};
        map[id] = count;
        await AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(map));
      } catch (e) {
        console.error('Failed to save like count', e);
      }
    }
  };

  const toggleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => prev + (newLiked ? 1 : -1));
    try {
      const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
      const likeMap = likeStored ? JSON.parse(likeStored) : {};
      likeMap[id] = (likeMap[id] || 0) + (newLiked ? 1 : -1);
      await AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(likeMap));
    } catch (e) {
      console.error('Failed to update cached like counts', e);
    }
    try {
      const likedStored = await AsyncStorage.getItem(
        `${LIKED_KEY_PREFIX}${user.id}`,
      );
      const likedMap = likedStored ? JSON.parse(likedStored) : {};
      if (newLiked) {
        likedMap[id] = true;
      } else {
        delete likedMap[id];
      }
      await AsyncStorage.setItem(
        `${LIKED_KEY_PREFIX}${user.id}`,
        JSON.stringify(likedMap),
      );
    } catch (e) {
      console.error('Failed to update cached likes', e);
    }

    if (newLiked) {
      await supabase
        .from('likes')
        .insert({ user_id: user.id, [isReply ? 'reply_id' : 'post_id']: id });
    } else {
      await supabase
        .from('likes')
        .delete()
        .match({ user_id: user.id, [isReply ? 'reply_id' : 'post_id']: id });
    }
    await refreshLikeCount();
  };

  return { likeCount, liked, toggleLike, refreshLikeCount };
}

export default useLike;
