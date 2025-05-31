import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './lib/supabase';
import { useAuth } from './AuthContext';

const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';

type LikeContextType = {
  likeCounts: Record<string, number>;
  likedItems: Record<string, boolean>;
  setLikeCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setLikedItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  toggleLike: (id: string, isPost: boolean) => Promise<void>;
  refreshLikeCount: (id: string, isPost: boolean) => Promise<void>;
};

const LikeContext = createContext<LikeContextType | undefined>(undefined);

export const LikeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth() as any;
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
      if (likeStored) {
        try {
          setLikeCounts(JSON.parse(likeStored));
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
        } else {
          setLikedItems({});
        }
      } else {
        setLikedItems({});

      }
    };
    load();
  }, [user]);

  const refreshLikeCount = async (id: string, isPost: boolean) => {
    const { data } = await supabase
      .from(isPost ? 'posts' : 'replies')
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

  const toggleLike = async (id: string, isPost: boolean) => {
    if (!user) return;
    const liked = likedItems[id];
    setLikedItems(prev => {
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
      await supabase.from('likes').delete().match({ user_id: user.id, [isPost ? 'post_id' : 'reply_id']: id });
    } else {
      await supabase.from('likes').insert({ user_id: user.id, [isPost ? 'post_id' : 'reply_id']: id });
    }
    await refreshLikeCount(id, isPost);
  };

  return (
    <LikeContext.Provider value={{ likeCounts, likedItems, setLikeCounts, setLikedItems, toggleLike, refreshLikeCount }}>
      {children}
    </LikeContext.Provider>
  );
};

export const useLikes = () => {
  const ctx = useContext(LikeContext);
  if (!ctx) throw new Error('useLikes must be used within LikeProvider');
  return ctx;
};
