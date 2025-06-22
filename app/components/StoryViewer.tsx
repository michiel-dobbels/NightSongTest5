import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  FlatList,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { Video } from 'expo-av';
import { useStories } from '../contexts/StoryContext';
import { colors } from '../styles/colors';

const { width, height } = Dimensions.get('window');

export default function StoryViewer() {
  const {
    visible,
    stories,
    currentIndex,
    next,
    prev,
    closeViewer,
    setIndex,
    viewer,
  } = useStories();

  const flatListRef = useRef<FlatList>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const holdProgress = useRef(0);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const videoRef = useRef<Video | null>(null);
  const [duration, setDuration] = useState(5000);

  const startAnimation = (d: number) => {
    progress.setValue(0);
    setDuration(d);
    animationRef.current?.stop();
    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: d,
      useNativeDriver: false,
    });
    animationRef.current.start(({ finished }) => {
      if (finished) next();
    });
  };

  useEffect(() => {
    if (!visible) return;
    flatListRef.current?.scrollToIndex({ index: currentIndex, animated: false });
    const story = stories[currentIndex];
    if (!story) return;
    if (story.media_type === 'image') {
      startAnimation(5000);
    }
    if (stories[currentIndex + 1]?.media_type === 'image') {
      Image.prefetch(stories[currentIndex + 1].media_url).catch(() => {});
    }
  }, [visible, currentIndex]);

  const handleHold = () => {
    animationRef.current?.stop();
    progress.stopAnimation(v => {
      holdProgress.current = v;
    });
    videoRef.current?.pauseAsync();
  };

  const handleRelease = () => {
    const remaining = (1 - holdProgress.current) * duration;
    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: remaining,
      useNativeDriver: false,
    });
    animationRef.current.start(({ finished }) => {
      if (finished) next();
    });
    videoRef.current?.playAsync();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 50) closeViewer();
      },
    }),
  ).current;

  if (!visible || stories.length === 0) return null;

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.page}>
      {item.media_type === 'image' ? (
        <Image source={{ uri: item.media_url }} style={styles.media} resizeMode="cover" />
      ) : (
        <Video
          ref={videoRef}
          source={{ uri: item.media_url }}
          style={styles.media}
          resizeMode="contain"
          shouldPlay
          isMuted
          onLoad={s => {
            startAnimation(s.durationMillis || 5000);
          }}
          onPlaybackStatusUpdate={status => {
            if (status.isLoaded && status.didJustFinish) next();
          }}
        />
      )}
      {item.overlay_text ? <Text style={styles.overlay}>{item.overlay_text}</Text> : null}
    </View>
  );

  const onMomentumEnd = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== currentIndex) setIndex(i);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeViewer}>
      <View style={styles.container} {...panResponder.panHandlers}>
        <TouchableWithoutFeedback onPressIn={handleHold} onPressOut={handleRelease}>
          <View style={{ flex: 1 }}>
            <View style={styles.progressRow} pointerEvents="none">
              {stories.map((_, i) => {
                const barStyle =
                  i === currentIndex
                    ? { transform: [{ scaleX: progress }] }
                    : i < currentIndex
                    ? { transform: [{ scaleX: 1 }] }
                    : { transform: [{ scaleX: 0 }] };
                return (
                  <View key={i} style={styles.barBackground}>
                    <Animated.View style={[styles.barForeground, barStyle]} />
                  </View>
                );
              })}
            </View>
            <View style={styles.header}>
              {viewer?.image_url ? (
                <Image source={{ uri: viewer.image_url }} style={styles.avatar} />
              ) : null}
              {viewer?.username ? <Text style={styles.username}>{viewer.username}</Text> : null}
            </View>
            <FlatList
              ref={flatListRef}
              data={stories}
              horizontal
              pagingEnabled
              onMomentumScrollEnd={onMomentumEnd}
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              renderItem={renderItem}
            />
            <View style={styles.touchRow} pointerEvents="box-none">
              <TouchableWithoutFeedback onPress={prev}>
                <View style={styles.touchArea} />
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback onPress={next}>
                <View style={styles.touchArea} />
              </TouchableWithoutFeedback>
            </View>
          </View>
        </TouchableWithoutFeedback>
        <TouchableOpacity style={styles.close} onPress={closeViewer}>
          <Text style={{ color: colors.text, fontSize: 18 }}>X</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const BAR_HEIGHT = 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  page: { width, height, justifyContent: 'center', alignItems: 'center' },
  media: { width, height, resizeMode: 'contain' },
  overlay: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    color: colors.text,
    fontSize: 20,
  },
  touchRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  touchArea: { flex: 1 },
  close: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 20,
  },
  progressRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  barBackground: {
    flex: 1,
    height: BAR_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 2,
    overflow: 'hidden',
  },
  barForeground: {
    height: BAR_HEIGHT,
    backgroundColor: '#fff',
    transform: [{ scaleX: 0 }],
    transformOrigin: 'left',
  },
  header: {
    position: 'absolute',
    top: 20,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  username: { color: '#fff', fontWeight: 'bold' },
});
