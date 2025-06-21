import React, { createContext, useContext, useRef } from 'react';
import StoryModal, { StoryItem, StoryModalRef } from '../components/StoryModal';
import { supabase } from '../../lib/supabase';

interface StoryContextValue {
  openUserStories: (userId: string) => Promise<boolean>;
}

const StoryContext = createContext<StoryContextValue | undefined>(undefined);

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const modalRef = useRef<StoryModalRef>(null);

  const openUserStories = async (userId: string): Promise<boolean> => {
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('stories')
      .select('id, media_url, overlay_text, created_at')
      .eq('user_id', userId)
      .gt('created_at', since)
      .order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      modalRef.current?.open(data as StoryItem[]);
      return true;
    }
    return false;
  };

  return (
    <StoryContext.Provider value={{ openUserStories }}>
      {children}
      <StoryModal ref={modalRef} />
    </StoryContext.Provider>
  );
};

export const useStory = () => {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error('useStory must be used within StoryProvider');
  return ctx;
};
