import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ViewToken } from 'react-native';
import * as FileSystem from 'expo-file-system';

import VideoFeedItem, { FeedVideo } from '../components/VideoFeedItem';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

interface CachedMap {
  [url: string]: string;
}

export default function VideoScreen() {
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [cached, setCached] = useState<CachedMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);

  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 80 };
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index!);
    }
  });

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('id, video_url, caption, profiles(username)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: FeedVideo[] = data.map((v: any) => ({
          id: v.id,
          video_url: v.video_url,
          caption: v.caption || '',
          username: v.profiles?.username || 'unknown',
        }));
        setVideos(mapped);
      } else {
        console.error('Failed to fetch videos', error);
      }
    };

    fetchVideos();
  }, []);

  const prefetch = useCallback(
    async (url: string) => {
      if (!url || cached[url]) return;
      try {
        const fileUri = FileSystem.cacheDirectory + encodeURIComponent(url);
        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists) {
          await FileSystem.downloadAsync(url, fileUri);
        }
        setCached(c => ({ ...c, [url]: fileUri }));
      } catch (e) {
        console.warn('Prefetch failed', e);
      }
    },
    [cached],
  );

  useEffect(() => {
    if (videos[currentIndex + 1]) {
      prefetch(videos[currentIndex + 1].video_url);
    }
  }, [currentIndex, videos, prefetch]);

  const toggleMute = useCallback(() => setMuted(m => !m), []);

  const renderItem = useCallback(
    ({ item, index }: { item: FeedVideo; index: number }) => (
      <VideoFeedItem
        video={{ ...item, localUri: cached[item.video_url] }}
        isActive={currentIndex === index}
        muted={muted}
        onToggleMute={toggleMute}
      />
    ),
    [currentIndex, muted, cached, toggleMute],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig}
        windowSize={3}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
