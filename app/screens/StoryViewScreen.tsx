import React, { useState, useRef } from 'react';
  import {
    View,
    StyleSheet,
    Image,
    Button,
    Pressable,
    Text,
    Alert,
    TouchableOpacity,
    PanResponder,
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
    if (index < stories.length - 1) {
      setIndex(i => i + 1);
    }
  };

  const prev = () => {
    if (index > 0) {
      setIndex(i => i - 1);
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
      <View style={styles.mediaContainer} {...panResponder.panHandlers}>
        <Text style={styles.counter}>{`${index + 1}/${stories.length}`}</Text>
        {user && story?.userId === user.id && (
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
            <Text style={styles.deleteText}>X</Text>
          </TouchableOpacity>
        )}
        {story?.imageUri && (
          <Image source={{ uri: story.imageUri }} style={styles.media} />
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
      <Button title="Close" onPress={() => navigation.goBack()} />
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
});
