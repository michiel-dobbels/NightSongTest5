import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Image,
  Modal,
  StyleSheet,
} from 'react-native';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../../AuthContext';
import { supabase, STORY_BUCKET } from '../../lib/supabase';
import { colors } from '../styles/colors';
import { uploadImage } from '../../lib/uploadImage';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function StoryUploadModal({ visible, onClose }: Props) {
  const { user } = useAuth()!;
  const [text, setText] = useState('');
  const [media, setMedia] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.canceled) {
      const uri = res.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      setMedia(`data:image/jpeg;base64,${base64}`);
      setIsVideo(false);
    }
  };

  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos });
    if (!res.canceled) {
      setMedia(res.assets[0].uri);
      setIsVideo(true);
    }
  };

  const handleSubmit = async () => {
    if (!user || !media) { onClose(); return; }
    let url: string | null = null;
    if (isVideo) {
      try {
        const ext = media.split('.').pop() || 'mp4';
        const path = `${user.id}-${Date.now()}.${ext}`;
        const resp = await fetch(media);
        const blob = await resp.blob();
        const { error } = await supabase.storage.from(STORY_BUCKET).upload(path, blob);
        if (!error) {
          url = supabase.storage.from(STORY_BUCKET).getPublicUrl(path).publicURL;
        }
      } catch (e) {
        console.error('video upload failed', e);
      }
    } else {
      url = await uploadImage(media, user.id);
    }
    if (url) {
      await supabase.from('stories').insert({ user_id: user.id, media_url: url, overlay_text: text });
    }
    setText('');
    setMedia(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <TextInput
          placeholder="Say something"
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          style={styles.input}
        />
        {media && !isVideo && <Image source={{ uri: media }} style={styles.preview} />}
        {media && isVideo && <Video source={{ uri: media }} style={styles.preview} useNativeControls isMuted resizeMode="contain" />}
        <View style={styles.row}>
          <Button title="Pick Image" onPress={pickImage} />
          <Button title="Pick Video" onPress={pickVideo} />
          <Button title="Post" onPress={handleSubmit} />
          <Button title="Cancel" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, flex: 1, padding: 20, justifyContent: 'center' },
  input: { backgroundColor: '#333', color: colors.text, padding: 10, borderRadius: 6, marginBottom: 10 },
  preview: { width: '100%', height: 200, borderRadius: 6, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
