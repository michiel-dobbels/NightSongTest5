import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './lib/supabase';
import { useAuth } from './AuthContext';

const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';

type Counts = Record<string, number>;
type LikedMap = Record<string, boolean>;

interface LikeContextType {
  likeCounts: Counts;
  likedItems: LikedMap;
  toggleLike: (id: string, isPost?: boolean) => Promise<void>;
  refreshLike: (id: string, isPost?: boolean) => Promise<void>;
  mergeCounts: (counts: Counts) => void;
  setLikedBulk: (liked: LikedMap) => void;
  removeCounts: (ids: string[]) => void;
  removeLiked: (ids: string[]) => void;
}

const LikeContext = createContext<LikeContextType | undefined>(undefined);

export const LikeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth() as any;
  const [likeCounts, setLikeCounts] = useState<Counts>({});
  const [likedItems, setLikedItems] = useState<LikedMap>({});

  // Load cached counts once
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
      if (stored) {
        try {
          setLikeCounts(JSON.parse(stored));

        } catch (e) {
          console.error('Failed to parse cached like counts', e);
        }
      }
    })();
  }, []);

  // Reload liked map when the user changes
  useEffect(() => {
    (async () => {
      if (user) {
        const stored = await AsyncStorage.getItem(`${LIKED_KEY_PREFIX}${user.id}`);
        if (stored) {
          try {
            setLikedItems(JSON.parse(stored));
          } catch (e) {
            console.error('Failed to parse cached likes', e);
          }
        } else {
          setLikedItems({});
        }
      } else {
        setLikedItems({});
      }
    })();
  }, [user]);

  const mergeCounts = (counts: Counts) => {
    setLikeCounts(prev => {
      const merged = { ...prev, ...counts };
      AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  const setLikedBulk = (liked: LikedMap) => {
    setLikedItems(prev => {
      const merged = { ...prev, ...liked };
      if (user) {
        AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user.id}`, JSON.stringify(merged));
      }
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

  const removeLiked = (ids: string[]) => {
    setLikedItems(prev => {
      const updated = { ...prev };
      ids.forEach(id => delete updated[id]);
      if (user) {
        AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const refreshLike = async (id: string, isPost = true) => {

    const { data } = await supabase
      .from(isPost ? 'posts' : 'replies')
      .select('like_count')
      .eq('id', id)
      .single();
    if (data) {
      mergeCounts({ [id]: data.like_count ?? 0 });
    }
  };

  const toggleLike = async (id: string, isPost = true) => {
    if (!user) return;
    const liked = likedItems[id];
    const newCount = (likeCounts[id] || 0) + (liked ? -1 : 1);


    setLikedItems(prev => {
      const updated = { ...prev, [id]: !liked };
      AsyncStorage.setItem(`${LIKED_KEY_PREFIX}${user.id}`, JSON.stringify(updated));
      return updated;
    });

    mergeCounts({ [id]: newCount });


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
        toggleLike,
        refreshLike,
        mergeCounts,
        setLikedBulk,
        removeCounts,
        removeLiked,
      }}
    >
      {children}
    </LikeContext.Provider>
  );
};

export const useLikes = () => {
  const ctx = useContext(LikeContext);
  if (!ctx) throw new Error('useLikes must be within LikeProvider');
  return ctx;
};


