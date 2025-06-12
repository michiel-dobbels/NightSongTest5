import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, FlatList } from 'react-native';
import Video from 'react-native-video';
import { supabase } from '../lib/supabase';
import { colors } from '../app/styles/colors';

export default function VideoScreen() {
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
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
        .select('id, user_id, video_url, created_at')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setVideos(data);
      } else {
        console.error('Failed to fetch videos', error);
      }
    };
    fetchVideos();
  }, []);

  const renderItem = ({ item, index }) => (
    <View style={styles.videoContainer}>
      <Video
        source={{ uri: item.video_url }}
        style={styles.video}
        resizeMode="contain"
        paused={currentIndex !== index}
        repeat
        muted={false}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig}
      />
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  videoContainer: {
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
