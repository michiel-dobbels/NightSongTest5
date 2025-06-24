import React from 'react';
import { View, StyleSheet, Image, Button } from 'react-native';
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
  const story = stories[0];

  return (
    <View style={styles.container}>
      {story?.imageUri && <Image source={{ uri: story.imageUri }} style={styles.media} />}
      {!story?.imageUri && story?.videoUri && (
        <Video source={{ uri: story.videoUri }} style={styles.media} useNativeControls resizeMode="contain" />
      )}
      <Button title="Close" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  media: { width: '100%', height: '80%', borderRadius: 6, marginBottom: 20 },
});
