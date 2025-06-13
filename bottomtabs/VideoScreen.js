import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import * as FileSystem from 'expo-file-system';
import VideoFeedItem from '../app/components/VideoFeedItem';

import { supabase } from '../lib/supabase';
import { colors } from '../app/styles/colors';

export default function VideoScreen() {
  const [videos, setVideos] = useState([]);
  const [cached, setCached] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 80 };
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  });

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('id, video_url, caption, profiles(username)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map(v => ({
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

  const prefetch = useCallback(async url => {
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
  }, [cached]);

  useEffect(() => {
    if (videos[currentIndex + 1]) {
      prefetch(videos[currentIndex + 1].video_url);
    }
  }, [currentIndex, videos, prefetch]);

  const toggleMute = useCallback(() => setMuted(m => !m), []);

  const renderItem = useCallback(
    ({ item, index }) => (
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
