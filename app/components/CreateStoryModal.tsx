import React, { useState } from 'react';
import {
  View,
  TextInput,
  Modal,
  Button,
  Image,
  StyleSheet,
} from 'react-native';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

export interface CreateStoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CreateStoryModal({ visible, onClose }: CreateStoryModalProps) {
  const { user } = useAuth()!;
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setMediaUri(result.assets[0].uri);
      setMediaType('image');
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    });
    if (!result.canceled) {
      setMediaUri(result.assets[0].uri);
      setMediaType('video');
    }
  };

  const reset = () => {
    setMediaUri(null);
    setMediaType(null);
    setCaption('');
    setUploading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePost = async () => {
    if (!mediaUri || !user || uploading) return;

    try {
      setUploading(true);
      const ext = mediaUri.split('.').pop() || (mediaType === 'image' ? 'jpg' : 'mp4');
      const path = `${user.id}-${Date.now()}.${ext}`;
      const response = await fetch(mediaUri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('stories-media')
        .upload(path, blob);
      if (uploadError) throw uploadError;
      const { publicURL } = supabase.storage
        .from('stories-media')
        .getPublicUrl(path);
      const { error } = await supabase.from('stories').insert({
        user_id: user.id,
        url: publicURL,
        caption: caption || null,
      });
      if (error) throw error;
      handleClose();
    } catch (e) {
      console.error('Failed to post story', e);
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TextInput
            placeholder="Add a caption (optional)"
            value={caption}
            onChangeText={setCaption}
            style={styles.input}
          />
          {mediaUri && mediaType === 'image' && (
            <Image source={{ uri: mediaUri }} style={styles.preview} />
          )}
          {mediaUri && mediaType === 'video' && (
            <Video
              source={{ uri: mediaUri }}
              style={styles.preview}
              useNativeControls
              isMuted
              resizeMode="contain"
            />
          )}
          <View style={styles.buttonRow}>
            <Button title="Pick Image" onPress={pickImage} />
            <Button title="Pick Video" onPress={pickVideo} />
          </View>
          <View style={styles.buttonRow}>
            <Button title="Post" onPress={handlePost} disabled={!mediaUri || uploading} />
            <Button title="Cancel" onPress={handleClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 8,
    width: '80%',
  },
  input: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    color: colors.text,
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
