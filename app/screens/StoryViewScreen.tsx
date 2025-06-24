import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Image,
    Pressable,
    Text,
    Alert,
    TouchableOpacity,
    PanResponder,
  Animated,
  } from 'react-native';

import { Video } from 'expo-av';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../styles/colors';
import { useStories } from '../contexts/StoryStoreContext';
import { useAuth } from '../../AuthContext';


export default function StoryViewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth()!;
  const { userId } = route.params as { userId: string };
  const { getStoriesForUser, removeStory } = useStories();

  const stories = getStoriesForUser(userId);
  const [index, setIndex] = useState(0);
  const story = stories[index];
  const progress = useRef(new Animated.Value(0)).current;

  const startProgress = () => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 6000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        next();
      }
    });
  };

  useEffect(() => {
    startProgress();
    // cleanup when unmounting
    return () => progress.stopAnimation();
  }, [index]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 10,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 50) {
          navigation.goBack();
        }

      },
    }),
  ).current;


  const next = () => {
    progress.stopAnimation();
    if (index < stories.length - 1) {
      setIndex(i => i + 1);
    } else {
      navigation.goBack();
    }
  };

  const prev = () => {
    progress.stopAnimation();
    if (index > 0) {
      setIndex(i => i - 1);
    } else {
      // restart progress if at first story
      progress.setValue(0);
      startProgress();
    }
  };

  const confirmDelete = () => {
    if (!story) return;
    if (!user || user.id !== story.userId) return;

    Alert.alert(
      'Are you sure you want to delete this story?',
      '',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeStory(story.id);
            const remaining = stories.filter((_, i) => i !== index);
            if (remaining.length === 0) {
              navigation.goBack();
              return;
            }
            if (index >= remaining.length) {
              setIndex(remaining.length - 1);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        {stories.map((_, i) => {
          const width =
            i < index
              ? '100%'
              : i === index
              ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
              : '0%';
          return (
            <View key={i} style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, { width }]} />
            </View>
          );
        })
      </View>
      <View style={styles.mediaContainer} {...panResponder.panHandlers}>
        <Text style={styles.counter}>{`${index + 1}/${stories.length}`}</Text>
        {user && story?.userId === user.id && (
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
            <Text style={styles.deleteText}>X</Text>
          </TouchableOpacity>
        )}

        {story?.imageUri && (
          <Image
            source={{ uri: story.imageUri }}
            style={styles.media}
            resizeMode="contain"
          />
        )}
        {!story?.imageUri && story?.videoUri && (
          <Video
            source={{ uri: story.videoUri }}
            style={styles.media}
            resizeMode="contain"
            shouldPlay
          />
        )}
        <Pressable style={styles.leftZone} onPress={prev} />
        <Pressable style={styles.rightZone} onPress={next} />
      </View>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  mediaContainer: { width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center' },
  media: { width: '100%', height: '100%', borderRadius: 6 },
  leftZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '50%',
  },
  rightZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '50%',
  },
  counter: {
    position: 'absolute',
    top: 10,
    left: 10,
    color: colors.text,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  deleteBtn: { position: 'absolute', top: 10, right: 10, padding: 6, zIndex: 2 },
  deleteText: { color: colors.text, fontSize: 18 },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    flexDirection: 'row',
    paddingHorizontal: 4,
    zIndex: 3,
  },
  progressBar: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    borderRadius: 2,
    marginHorizontal: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  closeButton: {
    position: 'absolute',
    bottom: '10%',
    alignSelf: 'center',
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 6,
    zIndex: 2,
  },
  closeText: { color: colors.text, fontSize: 18 },

});
