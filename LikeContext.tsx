import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './lib/supabase';
import { useAuth } from './AuthContext';

const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';

interface LikeContextValue {
  likeCounts: { [key: string]: number };
  likedItems: { [key: string]: boolean };
  setCounts: (counts: { [key: string]: number }) => void;
  setLikedItems: (likes: { [key: string]: boolean }) => void;
  removeCounts: (ids: string[]) => void;
  removeLikes: (ids: string[]) => void;
  toggleLike: (id: string, isPost: boolean) => Promise<void>;
  refreshLike: (id: string, isPost: boolean) => Promise<void>;
}

const LikeContext = createContext<LikeContextValue>({
  likeCounts: {},
  likedItems: {},
  setCounts: () => {},
  setLikedItems: () => {},
  removeCounts: () => {},
  removeLikes: () => {},
  toggleLike: async () => {},
  refreshLike: async () => {},
});

export const LikeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth() as any;
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [likedItems, setLikedItems] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const loadCounts = async () => {
      const stored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
      if (stored) {
        try {
          setLikeCounts(JSON.parse(stored));
        } catch {}
      }
    };
    loadCounts();
  }, []);

  useEffect(() => {
    const loadLikes = async () => {
      if (!user) {
        setLikedItems({});
        return;
      }
      const stored = await AsyncStorage.getItem(`${LIKED_KEY_PREFIX}${user.id}`);
      if (stored) {
        try {
          setLikedItems(JSON.parse(stored));
          return;
        } catch {}
      }
      const { data } = await supabase
        .from('likes')
        .select('post_id, reply_id')
        .eq('user_id', user.id);
      if (data) {
        const obj: any = {};
        data.forEach((row: any) => {
          const key = row.post_id || row.reply_id;
          if (key) obj[key] = true;
        });
        setLikedItems(obj);
        AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user.id}`, JSON.stringify(obj));
      }
    };
    loadLikes();
  }, [user]);

  const setCounts = (counts: { [key: string]: number }) => {
    setLikeCounts(prev => {
      const merged = { ...prev, ...counts };
      AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  const setLiked = (likes: { [key: string]: boolean }) => {
    if (!user) return;
    setLikedItems(prev => {
      const merged = { ...prev, ...likes };
      AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user.id}`, JSON.stringify(merged));
      return merged;
    });
  };

  const removeCounts = (ids: string[]) => {
    setLikeCounts(prev => {
      const updated = { ...prev };
      ids.forEach(id => delete updated[id]);
      AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeLikes = (ids: string[]) => {
    if (!user) return;
    setLikedItems(prev => {
      const updated = { ...prev };
      ids.forEach(id => delete updated[id]);
      AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const refreshLike = async (id: string, isPost: boolean) => {
    const { data } = await supabase
      .from(isPost ? 'posts' : 'replies')
      .select('like_count')
      .eq('id', id)
      .single();
    if (data) setCounts({ [id]: data.like_count ?? 0 });
  };

  const toggleLike = async (id: string, isPost: boolean) => {
    if (!user) return;
    const liked = likedItems[id];
    const newCount = (likeCounts[id] || 0) + (liked ? -1 : 1);
    setLiked({ [id]: !liked });
    setCounts({ [id]: newCount });
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
    await supabase
      .from(isPost ? 'posts' : 'replies')
      .update({ like_count: newCount })
      .eq('id', id);
    await refreshLike(id, isPost);
  };

  return (
    <LikeContext.Provider
      value={{
        likeCounts,
        likedItems,
        setCounts,
        setLikedItems: setLiked,
        removeCounts,
        removeLikes,
        toggleLike,
        refreshLike,
      }}
    >
      {children}
    </LikeContext.Provider>
  );
};

export const useLikes = () => useContext(LikeContext);

