import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { colors } from '../styles/colors';

export interface FeedVideo {
  id: string;
  video_url: string;
  username: string;
  caption: string;
  localUri?: string;
}

interface Props {
  video: FeedVideo;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
}

export default function VideoFeedItem({ video, isActive, muted, onToggleMute }: Props) {
  const ref = useRef<Video>(null);

  useEffect(() => {
    if (!isActive) {
      ref.current?.setPositionAsync(0);
    }
  }, [isActive]);

  return (
    <View style={styles.container}>
      <Video
        ref={ref}
        source={{ uri: video.localUri || video.video_url }}
        style={styles.video}
        resizeMode="cover"
        isLooping
        shouldPlay={isActive}
        isMuted={muted}
      />
      <View style={styles.infoContainer}>
        <Text style={styles.username}>@{video.username}</Text>
        <Text style={styles.caption}>{video.caption}</Text>
      </View>
      <TouchableOpacity style={styles.muteButton} onPress={onToggleMute}>
        <Text style={styles.muteText}>{muted ? 'Unmute' : 'Mute'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const { height, width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  video: {
    position: 'absolute',
    width,
    height,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 140,
    left: 10,
    paddingRight: 80,
  },
  username: {
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  caption: {
    color: colors.text,
  },
  muteButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 20,
  },
  muteText: {
    color: colors.text,
  },
});
