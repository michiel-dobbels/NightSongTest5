import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';

const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';

interface PostState {
  likeCount: number;
  liked: boolean;
}

interface ItemInfo {
  id: string;
  like_count?: number | null;
}

interface PostStore {
  posts: Record<string, PostState>;
  initialize: (items: ItemInfo[]) => Promise<void>;
  toggleLike: (id: string, isReply?: boolean) => Promise<void>;
  remove: (id: string) => void;
}

const PostStoreContext = createContext<PostStore | undefined>(undefined);

export const PostStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth() as any;
  const [posts, setPosts] = useState<Record<string, PostState>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
        const likeMap = likeStored ? JSON.parse(likeStored) : {};
        let likedMap: Record<string, boolean> = {};
        if (user) {
          const likedStored = await AsyncStorage.getItem(
            `${LIKED_KEY_PREFIX}${user.id}`,
          );
          likedMap = likedStored ? JSON.parse(likedStored) : {};
        }
        const merged: Record<string, PostState> = {};
        Object.keys(likeMap).forEach(id => {
          merged[id] = { likeCount: likeMap[id], liked: !!likedMap[id] };
        });
        setPosts(merged);
      } catch (e) {
        console.error('Failed to load post store', e);
      }
    };
    load();
  }, [user]);

  const initialize = async (items: ItemInfo[]) => {
    setPosts(prev => {
      const updated = { ...prev };
      items.forEach(item => {
        const existing = updated[item.id];
        const likeCount = item.like_count ?? existing?.likeCount ?? 0;
        const liked = existing?.liked ?? false;
        updated[item.id] = { likeCount, liked };
      });
      return updated;
    });
    try {
      const stored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
      const map = stored ? JSON.parse(stored) : {};
      items.forEach(i => {
        map[i.id] = i.like_count ?? map[i.id] ?? 0;
      });
      await AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(map));
    } catch (e) {
      console.error('Failed to persist like counts', e);
    }
  };

  const toggleLike = async (id: string, isReply: boolean = false) => {
    if (!user) return;
    const current = posts[id] || { likeCount: 0, liked: false };
    const newLiked = !current.liked;
    let newCount = current.likeCount + (newLiked ? 1 : -1);
    setPosts(prev => ({ ...prev, [id]: { likeCount: newCount, liked: newLiked } }));

    try {
      const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
      const likeMap = likeStored ? JSON.parse(likeStored) : {};
      likeMap[id] = newCount;
      await AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(likeMap));

      const likedStored = await AsyncStorage.getItem(`${LIKED_KEY_PREFIX}${user.id}`);
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

      if (id.startsWith('temp-')) {
        // Don't sync with Supabase until the item has a real UUID
        return;
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
      const { count } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .match(isReply ? { reply_id: id } : { post_id: id });
      if (typeof count === 'number') {
        newCount = count;
        setPosts(prev => ({
          ...prev,
          [id]: { likeCount: count, liked: newLiked },
        }));
        likeMap[id] = count;
        await AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(likeMap));
      }
    } catch (e) {
      console.error('Failed to toggle like', e);
    }
  };

  const remove = (id: string) => {
    setPosts(prev => {
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
  };

  return (
    <PostStoreContext.Provider value={{ posts, initialize, toggleLike, remove }}>
      {children}
    </PostStoreContext.Provider>
  );
};

export function usePostStore() {
  const ctx = useContext(PostStoreContext);
  if (!ctx) throw new Error('usePostStore must be used within PostStoreProvider');
  return ctx;
}
