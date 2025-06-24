import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Story {
  id: string;
  userId: string;
  imageUri?: string;
  videoUri?: string;
  createdAt: string;
}

interface StoryStore {
  stories: Story[];
  addStory: (story: Story) => Promise<void>;
  removeStory: (storyId: string) => void;

  getStoriesForUser: (userId: string) => Story[];
}

const StoryStoreContext = createContext<StoryStore | undefined>(undefined);

export const StoryStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('stories').then(stored => {
      if (stored) {
        try {
          setStories(JSON.parse(stored));
        } catch {}
      }
    });
  }, []);

  const addStory = useCallback(async (story: Story) => {
    setStories(prev => {
      const updated = [story, ...prev];
      AsyncStorage.setItem('stories', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeStory = useCallback((storyId: string) => {
    setStories(prev => {
      const updated = prev.filter(s => s.id !== storyId);
      AsyncStorage.setItem('stories', JSON.stringify(updated));
      return updated;
    });
  }, []);


  const getStoriesForUser = useCallback(
    (userId: string) => stories.filter(s => s.userId === userId),
    [stories],
  );

  return (
    <StoryStoreContext.Provider
      value={{ stories, addStory, removeStory, getStoriesForUser }}
    >

      {children}
    </StoryStoreContext.Provider>
  );
};

export function useStories() {
  const ctx = useContext(StoryStoreContext);
  if (!ctx) throw new Error('useStories must be used within StoryStoreProvider');
  return ctx;
}
