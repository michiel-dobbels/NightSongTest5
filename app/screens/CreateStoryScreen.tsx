import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Image } from 'react-native';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { supabase, STORY_BUCKET } from '../../lib/supabase';
import { uploadImage } from '../../lib/uploadImage';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

export default function CreateStoryScreen() {
  const { profile } = useAuth()!;
  const navigation = useNavigation();
  const [image, setImage] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [text, setText] = useState('');

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
      setVideo(uri);
      setImage(null);
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;
    let mediaUrl: string | null = null;
    let mediaType: 'image' | 'video' = 'image';

    if (image) {
      mediaUrl = await uploadImage(image, profile.id);
      mediaType = 'image';
    } else if (video) {
      try {
        const ext = video.split('.').pop() || 'mp4';
        const path = `${profile.id}-${Date.now()}.${ext}`;
        const resp = await fetch(video);
        const blob = await resp.blob();
        const { error } = await supabase.storage.from(STORY_BUCKET).upload(path, blob);
        if (!error) {
          const { publicURL } = supabase.storage.from(STORY_BUCKET).getPublicUrl(path);
          mediaUrl = publicURL;
        }
        mediaType = 'video';
      } catch (e) {
        console.error('Story video upload failed', e);
      }
    }

    if (!mediaUrl) return;

    await supabase.from('stories').insert({
      user_id: profile.id,
      media_url: mediaUrl,
      media_type: mediaType,
      overlay_text: text || null,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Overlay text"
        placeholderTextColor={colors.muted}
        value={text}
        onChangeText={setText}
        style={styles.input}
      />
      {image && <Image source={{ uri: image }} style={styles.preview} />}
      {!image && video && (
        <Video source={{ uri: video }} style={styles.preview} useNativeControls resizeMode="contain" />
      )}
      <View style={styles.row}>
        <Button title="Image" onPress={pickImage} />
        <Button title="Video" onPress={pickVideo} />
        <Button title="Post" onPress={handleSubmit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.background },
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
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
