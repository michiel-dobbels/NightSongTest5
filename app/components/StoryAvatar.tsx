import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';
import useStoryStatus from '../hooks/useStoryStatus';
import { useStories } from '../contexts/StoryContext';

interface Props {
  userId: string;
  uri?: string;
  size?: number;
  onFallbackPress?: () => void;
}

export default function StoryAvatar({ userId, uri, size = 48, onFallbackPress }: Props) {
  const hasStory = useStoryStatus(userId);
  const { openUserStories } = useStories();

  const handlePress = () => {
    if (hasStory) openUserStories(userId);
    else onFallbackPress?.();
  };

  const ringSize = size + 4;

  return (
    <TouchableOpacity onPress={handlePress}>
      <View
        style={hasStory ? [styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }] : null}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#555' }} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    borderColor: colors.storyRing,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
