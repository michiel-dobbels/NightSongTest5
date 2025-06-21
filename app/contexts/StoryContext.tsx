import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../../lib/supabase';
import StoryModal from '../components/StoryModal';

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  overlay_text?: string | null;
  created_at: string;
}

interface StoryContextValue {
  openUserStories: (userId: string) => Promise<void>;
}

const StoryContext = createContext<StoryContextValue | undefined>(undefined);

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const openUserStories = async (userId: string) => {
    if (visible) return;
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', userId)
      .gt('created_at', since)
      .order('created_at', { ascending: true });
    if (!data || data.length === 0) return;
    setStories(data as Story[]);
    setVisible(true);
  };
  const handleClose = () => setVisible(false);
  return (
    <StoryContext.Provider value={{ openUserStories }}>
      {children}
      <StoryModal visible={visible} stories={stories} onClose={handleClose} />
    </StoryContext.Provider>
  );
};

export function useStories() {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error('StoryContext missing');
  return ctx;
}
