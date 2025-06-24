import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Image, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { uploadImage } from '../../lib/uploadImage';
import { supabase, POST_VIDEO_BUCKET } from '../../lib/supabase';
import { useStories } from '../contexts/StoryStoreContext';
import { colors } from '../styles/colors';

export default function CreateStoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth()!;
  const { addStory } = useStories();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [mediaRatio, setMediaRatio] = useState(1);
  const screenWidth = Dimensions.get('window').width;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      Image.getSize(uri, (w, h) => {
        if (w && h) setMediaRatio(w / h);
      });
      setImageUri(uri);
      setVideoUri(null);
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
      setVideoUri(uri);
      setImageUri(null);
      setMediaRatio(16 / 9);
    }
  };

  const handlePost = async () => {
    if (!user || (!imageUri && !videoUri)) {
      navigation.goBack();
      return;
    }
    let uploadedImage: string | undefined;
    let uploadedVideo: string | undefined;
    if (imageUri) {
      uploadedImage = await uploadImage(imageUri, user.id) || imageUri;
    }
    if (videoUri) {
      try {
        const ext = videoUri.split('.').pop() || 'mp4';
        const path = `${user.id}-${Date.now()}.${ext}`;
        const resp = await fetch(videoUri);
        const blob = await resp.blob();
        const { error } = await supabase.storage.from(POST_VIDEO_BUCKET).upload(path, blob);
        if (!error) {
          const { publicURL } = supabase.storage.from(POST_VIDEO_BUCKET).getPublicUrl(path);
          uploadedVideo = publicURL || videoUri;
        } else {
          uploadedVideo = videoUri;
        }
      } catch {
        uploadedVideo = videoUri;
      }
    }
    await addStory({
      id: `story-${Date.now()}`,
      userId: user.id,
      imageUri: uploadedImage,
      videoUri: uploadedVideo,
      createdAt: new Date().toISOString(),
    });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Create a new story</Text>
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={[styles.preview, { height: screenWidth / mediaRatio }]}
          resizeMode="contain"
        />
      )}
      {!imageUri && videoUri && (
        <Video
          source={{ uri: videoUri }}
          style={[styles.preview, { height: screenWidth / mediaRatio }]}
          useNativeControls
          isMuted
          resizeMode="contain"
          onLoad={({ naturalSize }) => {
            const { width, height } = naturalSize || {} as any;
            if (width && height) setMediaRatio(width / height);
          }}
        />
      )}
      <View style={styles.buttonRow}>
        <Button title="Add Image" onPress={pickImage} />
        <Button title="Add Video" onPress={pickVideo} />
      </View>
      <View style={styles.buttonRow}>
        <Button title="Cancel" onPress={() => navigation.goBack()} />
        <Button title="Post" onPress={handlePost} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  text: { color: colors.text, fontSize: 18, marginBottom: 20 },
  preview: {
    width: '100%',
    borderRadius: 6,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
});
