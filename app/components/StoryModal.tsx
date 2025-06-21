import React, { useImperativeHandle, useState, forwardRef } from 'react';
import { Modal, StyleSheet, View, TouchableWithoutFeedback, Text } from 'react-native';
import { Video } from 'expo-av';
import { Image } from 'react-native';

export interface StoryItem {
  id: string;
  media_url: string;
  overlay_text?: string | null;
}

export interface StoryModalRef {
  open: (stories: StoryItem[]) => void;
  close: () => void;
}

const DISPLAY_TIME = 5000;

const StoryModal = forwardRef<StoryModalRef>((_props, ref) => {
  const [visible, setVisible] = useState(false);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [index, setIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    open: data => {
      setStories(data);
      setIndex(0);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  React.useEffect(() => {
    if (!visible) return;
    if (index >= stories.length) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setIndex(i => i + 1), DISPLAY_TIME);
    return () => clearTimeout(timer);
  }, [visible, index, stories.length]);

  if (!visible || index >= stories.length) return null;
  const story = stories[index];
  const isVideo = story.media_url.match(/\.mp4$/i);

  return (
    <Modal visible={visible} transparent onRequestClose={() => setVisible(false)}>
      <TouchableWithoutFeedback onPress={() => setIndex(i => i + 1)}>
        <View style={styles.container}>
          {isVideo ? (
            <Video source={{ uri: story.media_url }} style={styles.media} resizeMode="contain" shouldPlay isMuted />
          ) : (
            <Image source={{ uri: story.media_url }} style={styles.media} resizeMode="contain" />
          )}
          {story.overlay_text ? <Text style={styles.text}>{story.overlay_text}</Text> : null}
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

export default StoryModal;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  media: { width: '100%', height: '100%' },
  text: { position: 'absolute', bottom: 40, left: 20, right: 20, color: 'white', fontSize: 18 },
});
