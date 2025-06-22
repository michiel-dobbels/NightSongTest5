import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import StoryViewer from '../components/StoryViewer';

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  overlay_text?: string | null;
  media_type: 'image' | 'video';
  created_at: string;
  expires_at: string;
}

export interface ViewerProfile {
  username: string;
  image_url: string | null;
}

interface StoryContextValue {
  openUserStories: (userId: string) => Promise<void>;
  closeViewer: () => void;
  stories: (Story & { profiles?: any })[];
  visible: boolean;
  currentIndex: number;
  viewer: ViewerProfile | null;
  next: () => void;
  prev: () => void;
  setIndex: (index: number) => void;
}

const StoryContext = createContext<StoryContextValue | undefined>(undefined);

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stories, setStories] = useState<(Story & { profiles?: any })[]>([]);
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewer, setViewer] = useState<ViewerProfile | null>(null);
  const loadingRef = useRef(false);

  const openUserStories = useCallback(async (userId: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const { data, error } = await supabase
      .from('stories')
      .select('*, profiles(username, image_url)')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });
    loadingRef.current = false;
    if (error) {
      console.error('Failed to fetch stories', error);
      return;
    }
    if (data && data.length > 0) {
      const { profiles, ...first } = data[0] as any;
      setViewer({
        username: profiles?.username ?? '',
        image_url: profiles?.image_url ?? null,
      });
      setStories(data as any);
      setCurrentIndex(0);
      setVisible(true);
    }
  }, []);

  const closeViewer = useCallback(() => {
    setVisible(false);
    setStories([]);
    setCurrentIndex(0);
    setViewer(null);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex(i => {
      if (i < stories.length - 1) return i + 1;
      closeViewer();
      return i;
    });
  }, [stories.length, closeViewer]);

  const prev = useCallback(() => {
    setCurrentIndex(i => Math.max(0, i - 1));
  }, []);

  const setIndex = useCallback(
    (index: number) => {
      setCurrentIndex(i => {
        if (index < 0) return 0;
        if (index >= stories.length) {
          closeViewer();
          return i;
        }
        return index;
      });
    },
    [stories.length, closeViewer],
  );

  const value: StoryContextValue = {
    openUserStories,
    closeViewer,
    stories,
    visible,
    currentIndex,
    viewer,
    next,
    prev,
    setIndex,
  };

  return (
    <StoryContext.Provider value={value}>
      {children}
      <StoryViewer />
    </StoryContext.Provider>
  );
};

export function useStories() {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error('useStories must be used within StoryProvider');
  return ctx;
}
