import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './lib/supabase';
import { useAuth } from './AuthContext';

interface LikeContextValue {
  likeCounts: Record<string, number>;
  likedItems: Record<string, boolean>;
  toggleLike: (id: string, isPost: boolean) => Promise<void>;
  refreshLikeCounts: (ids: { posts?: string[]; replies?: string[] }) => Promise<void>;
}

const LikeContext = createContext<LikeContextValue>({
  likeCounts: {},
  likedItems: {},
  toggleLike: async () => {},
  refreshLikeCounts: async () => {},
});

const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';

export const LikeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth() as any;
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});


  useEffect(() => {
    const load = async () => {
      const storedCounts = await AsyncStorage.getItem(LIKE_COUNT_KEY);
      if (storedCounts) {
        try {
          setLikeCounts(JSON.parse(storedCounts));
        } catch (e) {
          console.error('Failed to parse cached like counts', e);
        }
      }
      if (user) {
        const likedStored = await AsyncStorage.getItem(`${LIKED_KEY_PREFIX}${user.id}`);
        if (likedStored) {
          try {
            setLikedItems(JSON.parse(likedStored));
          } catch (e) {
            console.error('Failed to parse cached likes', e);
          }
        }
      } else {
        setLikedItems({});

      }
    };
    load();
  }, [user]);

  const refreshLikeCounts = async ({ posts = [], replies = [] }: { posts?: string[]; replies?: string[] }) => {
    if (posts.length) {
      const { data } = await supabase.from('posts').select('id, like_count').in('id', posts);
      if (data) {
        const entries = data.map(p => [p.id, p.like_count ?? 0]);
        setLikeCounts(prev => {
          const updated = { ...prev, ...Object.fromEntries(entries) } as Record<string, number>;
          AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    }
    if (replies.length) {
      const { data } = await supabase.from('replies').select('id, like_count').in('id', replies);
      if (data) {
        const entries = data.map(r => [r.id, r.like_count ?? 0]);
        setLikeCounts(prev => {
          const updated = { ...prev, ...Object.fromEntries(entries) } as Record<string, number>;
          AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    }
  };

  const refreshLikeCount = async (id: string, isPost: boolean) => {

    const { data } = await supabase
      .from(isPost ? 'posts' : 'replies')
      .select('like_count')
      .eq('id', id)
      .single();
    if (data) {
      setLikeCounts(prev => {
        const updated = { ...prev, [id]: data.like_count ?? 0 };
        AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(updated));
        return updated;
      });

    }
  };

  const toggleLike = async (id: string, isPost: boolean) => {
    if (!user) return;
    const liked = likedItems[id];
    setLikedItems(prev => {
      const updated = { ...prev, [id]: !liked };
      AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user.id}`, JSON.stringify(updated));
      return updated;
    });
    if (liked) {
      await supabase
        .from('likes')
        .delete()
        .match({ user_id: user.id, [isPost ? 'post_id' : 'reply_id']: id });
    } else {
      await supabase
        .from('likes')
        .insert({ user_id: user.id, [isPost ? 'post_id' : 'reply_id']: id });
    }
    await refreshLikeCount(id, isPost);
  };

  const value: LikeContextValue = {
    likeCounts,
    likedItems,
    toggleLike,
    refreshLikeCounts,
  };

  return <LikeContext.Provider value={value}>{children}</LikeContext.Provider>;
};

export const useLikes = () => useContext(LikeContext);


