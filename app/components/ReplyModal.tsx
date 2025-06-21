import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Image,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { colors } from '../styles/colors';

export interface ReplyModalProps {
  visible: boolean;
  onSubmit: (text: string, image?: string | null, video?: string | null) => void;
  onClose: () => void;
}

export default function ReplyModal({ visible, onSubmit, onClose }: ReplyModalProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      setImage(`data:image/jpeg;base64,${base64}`);
      setVideo(null);
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const info = await FileSystem.getInfoAsync(uri);
      if (info.size && info.size > 20 * 1024 * 1024) {
        // eslint-disable-next-line no-alert
        alert('Video too large, please select one under 20MB.');
        return;
      }
      setVideo(uri);
      setImage(null);
    }
  };

  const handleSubmit = () => {
    onSubmit(text, image, video);
    setText('');
    setImage(null);
    setVideo(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <TextInput
            placeholder="Write a reply"
            value={text}
            onChangeText={setText}
            style={styles.input}
            multiline
          />
          {image && <Image source={{ uri: image }} style={styles.preview} />}
          {!image && video && (
            <Video
              source={{ uri: video }}
              style={styles.preview}
              useNativeControls
              isMuted
              resizeMode="contain"
            />
          )}
          <View style={styles.buttonRow}>
            <Button title="Add Image" onPress={pickImage} />
            <Button title="Add Video" onPress={pickVideo} />
            <Button title="Post" onPress={handleSubmit} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    padding: 20,
  },
  input: {
    backgroundColor: '#111',
    color: '#fff',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
});
