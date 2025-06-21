import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import Stories from 'react-native-stories-view';
import { colors } from '../styles/colors';
import { Story } from '../contexts/StoryContext';

interface Props {
  visible: boolean;
  stories: Story[];
  onClose: () => void;
}

export default function StoryModal({ visible, stories, onClose }: Props) {
  if (!visible) return null;
  const data = stories.map(s => ({ story: s.media_url, swipeText: s.overlay_text || '' }));
  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide">
      <Stories
        stories={data}
        onComplete={onClose}
        onClose={onClose}
        duration={5}
        customStyles={{ storyContainer: styles.container }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
});
