import React, { useState } from 'react';
import { View, Button, TextInput, StyleSheet, Image, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { supabase, POST_VIDEO_BUCKET } from '../../lib/supabase';
import { uploadImage } from '../../lib/uploadImage';
import { colors } from '../styles/colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BOTTOM_OFFSET = SCREEN_HEIGHT * 0.1;

export default function StoryUploadScreen() {
  const { user } = useAuth()!;
  const navigation = useNavigation<any>();

  const [media, setMedia] = useState<string | null>(null);
  const [type, setType] = useState<'image' | 'video' | null>(null);
  const [text, setText] = useState('');

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setMedia(asset.uri);
      setType(asset.type === 'video' ? 'video' : 'image');
    }
  };

  const upload = async () => {
    if (!user || !media || !type) return;
    let mediaUrl: string | null = null;
    if (type === 'image') {
      mediaUrl = await uploadImage(media, user.id);
    } else {
      try {
        const ext = media.split('.').pop() || 'mp4';
        const path = `${user.id}-${Date.now()}.${ext}`;
        const resp = await fetch(media);
        const blob = await resp.blob();
        const { error: uploadError } = await supabase.storage
          .from(POST_VIDEO_BUCKET)
          .upload(path, blob);
        if (!uploadError) {
          const { publicURL } = supabase.storage
            .from(POST_VIDEO_BUCKET)
            .getPublicUrl(path);
          mediaUrl = publicURL;
        }
      } catch (e) {
        console.error('Video upload failed', e);
      }
    }
    if (!mediaUrl) return;

    await supabase.from('stories').insert({
      user_id: user.id,
      media_url: mediaUrl,
      overlay_text: text,
    });
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingBottom: BOTTOM_OFFSET }]}>
      {media && type === 'image' && (
        <Image source={{ uri: media }} style={styles.preview} />
      )}
      {media && type === 'video' && (
        <Video source={{ uri: media }} style={styles.preview} shouldPlay />
      )}
      <Button title="Pick Image or Video" onPress={pickMedia} />
      <TextInput
        style={styles.input}
        placeholder="Say something"
        placeholderTextColor={colors.muted}
        value={text}
        onChangeText={setText}
      />
      <Button title="Upload" onPress={upload} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  input: {
    backgroundColor: '#333',
    color: colors.text,
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  preview: { width: '100%', height: 200, marginBottom: 10 },
});
