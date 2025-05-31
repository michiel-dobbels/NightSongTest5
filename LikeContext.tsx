import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './lib/supabase';
import { useAuth } from './AuthContext';

const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';

interface LikeContextType {
  likeCounts: Record<string, number>;
  likedItems: Record<string, boolean>;
  setLikeCounts: (counts: Record<string, number>) => void;
  setLikedItems: (items: Record<string, boolean>) => void;
  toggleLike: (id: string, isPost: boolean) => Promise<void>;
  refreshLike: (id: string, isPost: boolean) => Promise<void>;
}

const LikeContext = createContext<LikeContextType | undefined>(undefined);

export const LikeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth() as any;
  const [likeCounts, internalSetCounts] = useState<Record<string, number>>({});
  const [likedItems, internalSetLiked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const storedCounts = await AsyncStorage.getItem(LIKE_COUNT_KEY);
      if (storedCounts) {
        try { internalSetCounts(JSON.parse(storedCounts)); } catch {}
      }
      if (user) {
        const storedLiked = await AsyncStorage.getItem(`${LIKED_KEY_PREFIX}${user.id}`);
        if (storedLiked) {
          try { internalSetLiked(JSON.parse(storedLiked)); } catch {}
        }
      } else {
        internalSetLiked({});
      }
    };
    load();
  }, [user]);

  const setLikeCounts = (counts: Record<string, number>) => {
    internalSetCounts(counts);
    AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
  };

  const setLikedItems = (items: Record<string, boolean>) => {
    internalSetLiked(items);
    if (user) {
      AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user.id}`, JSON.stringify(items));
    }
  };

  const refreshLike = async (id: string, isPost: boolean) => {
    const { data } = await supabase
      .from(isPost ? 'posts' : 'replies')
      .select('like_count')
      .eq('id', id)
      .single();
    if (data) {
      setLikeCounts({ ...likeCounts, [id]: data.like_count ?? 0 });
    }
  };

  const toggleLike = async (id: string, isPost: boolean) => {
    if (!user) return;
    const liked = likedItems[id];
    const newCount = (likeCounts[id] || 0) + (liked ? -1 : 1);
    setLikedItems({ ...likedItems, [id]: !liked });
    setLikeCounts({ ...likeCounts, [id]: newCount });

    if (liked) {
      await supabase.from('likes').delete().match({ user_id: user.id, [isPost ? 'post_id' : 'reply_id']: id });
    } else {
      await supabase.from('likes').insert({ user_id: user.id, [isPost ? 'post_id' : 'reply_id']: id });
    }
    await refreshLike(id, isPost);
  };

  return (
    <LikeContext.Provider value={{ likeCounts, likedItems, setLikeCounts, setLikedItems, toggleLike, refreshLike }}>
      {children}
    </LikeContext.Provider>
  );
};

export const useLikeContext = () => {
  const ctx = useContext(LikeContext);
  if (!ctx) throw new Error('useLikeContext must be used within LikeProvider');
  return ctx;
};
