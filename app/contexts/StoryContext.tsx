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
  profiles?: {
    username: string | null;
    name: string | null;
    image_url: string | null;
  } | null;

}

interface StoryContextValue {
  openUserStories: (userId: string) => Promise<void>;
  closeViewer: () => void;
  stories: Story[];
  visible: boolean;
  currentIndex: number;
  next: () => void;
  prev: () => void;
}

const StoryContext = createContext<StoryContextValue | undefined>(undefined);

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const loadingRef = useRef(false);

  const openUserStories = useCallback(async (userId: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const { data, error } = await supabase
      .from('stories')
      .select('*, profiles(username, name, image_url)')

      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });
    loadingRef.current = false;
    if (error) {
      console.error('Failed to fetch stories', error);
      return;
    }
    if (data && data.length > 0) {
      setStories(data as Story[]);
      setCurrentIndex(0);
      setVisible(true);
    }
  }, []);

  const closeViewer = useCallback(() => {
    setVisible(false);
    setStories([]);
    setCurrentIndex(0);
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

  const value: StoryContextValue = {
    openUserStories,
    closeViewer,
    stories,
    visible,
    currentIndex,
    next,
    prev,
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
