import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Button,
  Pressable,
} from 'react-native';
import { Video } from 'expo-av';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../styles/colors';
import { useStories } from '../contexts/StoryStoreContext';

export default function StoryViewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { userId } = route.params as { userId: string };
  const { getStoriesForUser } = useStories();
  const stories = getStoriesForUser(userId);
  const [index, setIndex] = useState(0);
  const story = stories[index];

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

  return (
    <View style={styles.container}>
      <View style={styles.mediaContainer}>
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
});
