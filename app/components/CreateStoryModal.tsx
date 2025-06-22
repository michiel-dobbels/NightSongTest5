import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Image,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../../AuthContext';
import { supabase, STORIES_BUCKET } from '../../lib/supabase';
import { colors } from '../styles/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CreateStoryModal({ visible, onClose }: Props) {
  const { user } = useAuth()!;
  const [media, setMedia] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setMedia(result.assets[0].uri);
      setIsVideo(false);
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
      setMedia(uri);
      setIsVideo(true);
    }
  };

  const reset = () => {
    setMedia(null);
    setIsVideo(false);
    setCaption('');
  };

  const handlePost = async () => {
    if (!media || !user) return;
    try {
      const ext = media.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const path = `${user.id}-${Date.now()}.${ext}`;
      const resp = await fetch(media);
      const blob = await resp.blob();
      const { error } = await supabase.storage
        .from(STORIES_BUCKET)
        .upload(path, blob);
      let url = media;
      if (!error) {
        const { publicURL } = supabase.storage
          .from(STORIES_BUCKET)
          .getPublicUrl(path);
        if (publicURL) url = publicURL;
      }
      const { error: insertError } = await supabase.from('stories').insert({
        user_id: user.id,
        url,
        caption: caption || null,
        created_at: new Date().toISOString(),
      });
      if (insertError) {
        console.error('Failed to create story', insertError);
        return;
      }
      reset();
      onClose();
    } catch (e) {
      console.error('Story upload failed', e);
    }
  };

  const handleCancel = () => {
    reset();
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
            placeholder="Add a caption (optional)"
            value={caption}
            onChangeText={setCaption}
            style={styles.input}
            multiline
          />
          {media && !isVideo && <Image source={{ uri: media }} style={styles.preview} />}
          {media && isVideo && (
            <Video
              source={{ uri: media }}
              style={styles.preview}
              useNativeControls
              isMuted
              resizeMode="contain"
            />
          )}
          <View style={styles.buttonRow}>
            <Button title="Add Image" onPress={pickImage} />
            <Button title="Add Video" onPress={pickVideo} />
            <Button title="Post" onPress={handlePost} />
            <Button title="Cancel" onPress={handleCancel} />
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

