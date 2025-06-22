import React, { useRef } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
  Text,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { Video } from 'expo-av';
import { useStories } from '../contexts/StoryContext';
import useStoryProgress from '../hooks/useStoryProgress';
import { colors } from '../styles/colors';

const { width, height } = Dimensions.get('window');

export default function StoryViewerModal() {
  const { visible, stories, closeViewer } = useStories();
  const progress = useStoryProgress(stories.length, closeViewer);
  const { index, next, prev, reset } = progress;

  React.useEffect(() => {
    reset();
  }, [stories]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 50) closeViewer();
      },
    }),
  ).current;

  if (!visible || stories.length === 0) return null;
  const story = stories[index];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={closeViewer}
    >
      <View style={styles.container} {...panResponder.panHandlers}>
        {story.media_type === 'image' ? (
          <Image
            source={{ uri: story.media_url }}
            style={styles.media}
            resizeMode="cover"
          />
        ) : (
          <Video
            source={{ uri: story.media_url }}
            style={styles.media}
            resizeMode="cover"
            shouldPlay
            isMuted
          />
        )}
        {story.overlay_text ? (
          <Text style={styles.overlay}>{story.overlay_text}</Text>
        ) : null}
        <View style={styles.touchRow} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={prev}>
            <View style={styles.touchArea} />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback onPress={next}>
            <View style={styles.touchArea} />
          </TouchableWithoutFeedback>
        </View>
        <TouchableOpacity style={styles.close} onPress={closeViewer}>
          <Text style={{ color: colors.text, fontSize: 18 }}>X</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width,
    height,
  },
  overlay: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  touchRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  touchArea: {
    flex: 1,
  },
  close: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
});
