import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ViewToken, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';

import VideoFeedItem, { FeedVideo } from '../components/VideoFeedItem';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

interface CachedMap {
  [url: string]: string;
}

const PAGE_SIZE = 10;

const dedupeById = (arr: FeedVideo[]): FeedVideo[] => {
  const seen = new Set<string>();
  const result: FeedVideo[] = [];
  for (const item of arr) {
    if (!seen.has(item.id)) {
      result.push(item);
      seen.add(item.id);
    }
  }
  return result;
};

export default function VideoScreen() {
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [cached, setCached] = useState<CachedMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 80 };
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index!);
    }
  });

  const fetchVideos = useCallback(
    async (offset = 0, append = false) => {
      try {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);

        const { data, error } = await supabase
          .from('posts')
          .select('id, video_url, content, username, profiles(username)')
          .neq('video_url', null)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE)
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) throw error;

        if (data) {
          const mapped: FeedVideo[] = data
            .filter((v: any) => v.video_url)
            .map((v: any) => ({
              id: v.id,
              video_url: v.video_url,
              caption: v.content || '',
              username: v.profiles?.username || v.username || 'unknown',
            }));

          setVideos(prev => {
            const combined = append ? [...prev, ...mapped] : mapped;
            return dedupeById(combined);
          });
          setHasMore(data.length === PAGE_SIZE);
        }
      } catch (e) {
        console.error('Failed to fetch videos', e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchVideos(0, false);
  }, [fetchVideos]);

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
      {loading && videos.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="white" />
      ) : (
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
          onEndReached={() => {
            if (!loadingMore && hasMore) {
              fetchVideos(videos.length, true);
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="white" /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
