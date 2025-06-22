import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { likeEvents } from '../likeEvents';
import { postEvents } from '../postEvents';

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
  /**
   * Retrieve the like state for a post without triggering a re-render
   */
  getState: (id: string) => PostState | undefined;
  initialize: (items: ItemInfo[]) => Promise<void>;
  mergeLiked: (map: Record<string, boolean>) => Promise<void>;
  toggleLike: (id: string, isReply?: boolean) => Promise<void>;
  remove: (id: string) => void;
}

const PostStoreContext = createContext<PostStore | undefined>(undefined);

export const PostStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, updatePost } = useAuth()!;
  const postsRef = useRef<Record<string, PostState>>({});
  const getState = useCallback((id: string) => postsRef.current[id], []);
  const lastLoadedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user?.id && lastLoadedUserIdRef.current === user.id) {
      return;
    }
    if (!user) {
      postsRef.current = {};
      lastLoadedUserIdRef.current = null;
      return;
    }
    const load = async () => {
      try {
        const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
        const likeMap = likeStored ? JSON.parse(likeStored) : {};
        const postStored = await AsyncStorage.getItem('cached_posts');
        if (postStored) {
          try {
            const arr = JSON.parse(postStored);
            arr.forEach((p: any) => {
              if (
                p.id &&
                typeof p.like_count === 'number' &&
                likeMap[p.id] === undefined
              ) {
                likeMap[p.id] = p.like_count;
              }
            });
          } catch (err) {
            console.error('Failed to parse cached posts', err);
          }
        }
        let likedMap: Record<string, boolean> = {};
        if (user) {
          const likedStored = await AsyncStorage.getItem(
            `${LIKED_KEY_PREFIX}${user.id}`,
          );
          likedMap = likedStored ? JSON.parse(likedStored) : {};
        }
        postsRef.current = (() => {
          const prev = postsRef.current;
          const merged = { ...prev };
          const ids = new Set([
            ...Object.keys(likeMap),
            ...Object.keys(likedMap),
          ]);
          ids.forEach((id) => {
            merged[id] = {
              likeCount: prev[id]?.likeCount ?? likeMap[id] ?? 0,
              liked: prev[id]?.liked ?? !!likedMap[id],
            };
          });
          return merged;
        })();
      } catch (e) {
        console.error('Failed to load post store', e);
      }
    };
    load().then(() => {
      if (user?.id) lastLoadedUserIdRef.current = user.id;
    });
  }, [user?.id]);

  const initialize = useCallback(async (items: ItemInfo[]) => {
    const prev = postsRef.current;
    const updated = { ...prev };
    items.forEach((item) => {
      const existing = updated[item.id];
      const likeCount =
        item.like_count !== undefined && item.like_count !== null
          ? item.like_count
          : existing?.likeCount ?? 0;

      const liked = existing?.liked ?? false;
      updated[item.id] = { likeCount, liked };
    });
    postsRef.current = updated;
    items.forEach((item) => {
      const state = updated[item.id];
      likeEvents.emit('likeChanged', {
        id: item.id,
        count: state.likeCount,
        liked: state.liked,
      });
    });
    try {
      const stored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
      const map = stored ? JSON.parse(stored) : {};
      items.forEach((i) => {
        if (i.like_count !== undefined && i.like_count !== null) {
          map[i.id] = i.like_count;
        }
      });
      await AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(map));
    } catch (e) {
      console.error('Failed to persist like counts', e);
    }
  }, []);

  const mergeLiked = useCallback(
    async (likedMap: Record<string, boolean>) => {
      if (!user) return;
      {
        const prev = postsRef.current;
        const updated = { ...prev };
        Object.entries(likedMap).forEach(([id, liked]) => {
          const existing = updated[id] || { likeCount: 0, liked: false };
          updated[id] = { likeCount: existing.likeCount, liked };
        });
        postsRef.current = updated;
        Object.entries(likedMap).forEach(([id, liked]) => {
          const state = updated[id];
          likeEvents.emit('likeChanged', {
            id,
            count: state.likeCount,
            liked,
          });
        });
      }
      try {
        const stored = await AsyncStorage.getItem(
          `${LIKED_KEY_PREFIX}${user.id}`,
        );
        const map = stored ? JSON.parse(stored) : {};
        Object.entries(likedMap).forEach(([id, liked]) => {
          if (liked) {
            map[id] = true;
          } else {
            delete map[id];
          }
        });
        await AsyncStorage.setItem(
          `${LIKED_KEY_PREFIX}${user.id}`,
          JSON.stringify(map),
        );
      } catch (e) {
        console.error('Failed to persist liked state', e);
      }
    },
    [user?.id],
  );

  const toggleLike = useCallback(
    async (id: string, isReply: boolean = false) => {
      if (!user) return;
      const current = postsRef.current[id] || { likeCount: 0, liked: false };
      const newLiked = !current.liked;
      let newCount = current.likeCount + (newLiked ? 1 : -1);
      postsRef.current = {
        ...postsRef.current,
        [id]: { likeCount: newCount, liked: newLiked },
      };
      if (!isReply) {
        likeEvents.emit('likeChanged', {
          id,
          count: newCount,
          liked: newLiked,
        });
        // updatePost would cause a global context change which re-renders the
        // entire HomeScreen feed. The like event is sufficient for local UI
        // updates, so avoid calling updatePost here.
      }

      try {
        const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
        const likeMap = likeStored ? JSON.parse(likeStored) : {};
        likeMap[id] = newCount;
        await AsyncStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(likeMap));

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

        if (!isReply) {
          try {
            const postStored = await AsyncStorage.getItem('cached_posts');
            if (postStored) {
              const arr = JSON.parse(postStored);
              const updated = arr.map((p: any) =>
                p.id === id ? { ...p, like_count: newCount } : p,
              );
              await AsyncStorage.setItem(
                'cached_posts',
                JSON.stringify(updated),
              );
            }
          } catch (err) {
            console.error('Failed to update cached posts', err);
          }
        }

        if (id.startsWith('temp-')) {
          // Don't sync with Supabase until the item has a real UUID
          return;
        }

        if (newLiked) {
          await supabase
            .from('likes')
            .insert({
              user_id: user.id,
              [isReply ? 'reply_id' : 'post_id']: id,
            });
        } else {
          await supabase
            .from('likes')
            .delete()
            .match({
              user_id: user.id,
              [isReply ? 'reply_id' : 'post_id']: id,
            });
        }
        // Do not refresh counts from Supabase to avoid feed re-renders
        // The locally updated count is good enough for immediate feedback
      } catch (e) {
        console.error('Failed to toggle like', e);
      }
    },
    [user?.id, updatePost],
  );

  const remove = useCallback((id: string) => {
    const { [id]: _omit, ...rest } = postsRef.current;
    postsRef.current = rest;
    postEvents.emit('postDeleted', id);
  }, []);

  const value = useMemo(
    () => ({ getState, initialize, mergeLiked, toggleLike, remove }),
    [getState, initialize, mergeLiked, toggleLike, remove],
  );

  return (
    <PostStoreContext.Provider value={value}>
      {children}
    </PostStoreContext.Provider>
  );
};

export function usePostStore() {
  const ctx = useContext(PostStoreContext);
  if (!ctx)
    throw new Error('usePostStore must be used within PostStoreProvider');
  return ctx;
}
