import React, { useEffect, useRef } from 'react';
import { Modal, View, Image, StyleSheet, TouchableWithoutFeedback, Dimensions, Text, TouchableOpacity, PanResponder } from 'react-native';
import { Video } from 'expo-av';
import { useStories } from '../contexts/StoryContext';
import { colors } from '../styles/colors';

const { width, height } = Dimensions.get('window');

export default function StoryViewer() {
  const { visible, stories, currentIndex, next, prev, closeViewer } = useStories();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!visible) return;
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      next();
    }, 5000);
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
    };
  }, [visible, currentIndex, next]);

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
  const story = stories[currentIndex];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={closeViewer}
    >

      <View style={styles.container} {...panResponder.panHandlers}>
        <TouchableOpacity style={styles.close} onPress={closeViewer}>
          <Text style={{ color: colors.text, fontSize: 18 }}>X</Text>
        </TouchableOpacity>
        <View style={styles.infoRow}>
          {story.profiles?.image_url ? (
            <Image source={{ uri: story.profiles.image_url }} style={styles.infoAvatar} />
          ) : (
            <View style={[styles.infoAvatar, styles.placeholder]} />
          )}
          <Text style={styles.infoName}>
            {story.profiles?.name || story.profiles?.username || ''}
          </Text>
        </View>

        {story.media_type === 'image' ? (
          <Image source={{ uri: story.media_url }} style={styles.media} resizeMode="contain" />
        ) : (
          <Video source={{ uri: story.media_url }} style={styles.media} resizeMode="contain" shouldPlay isMuted />
        )}
        {story.overlay_text ? <Text style={styles.overlay}>{story.overlay_text}</Text> : null}
        <View style={styles.touchRow} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={prev}><View style={styles.touchArea} /></TouchableWithoutFeedback>
          <TouchableWithoutFeedback onPress={next}><View style={styles.touchArea} /></TouchableWithoutFeedback>
        </View>
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
  touchArea: {
    flex: 1,
  },
  close: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  infoRow: {
    position: 'absolute',
    top: 40,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  infoName: { color: colors.text, fontSize: 16 },
  placeholder: { backgroundColor: '#555' },

});
