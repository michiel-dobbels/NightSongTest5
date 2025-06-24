import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Image } from 'react-native';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { colors } from '../styles/colors';

export default function CreateStoryScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
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
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Create a new story</Text>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}
      {!imageUri && videoUri && (
        <Video
          source={{ uri: videoUri }}
          style={styles.preview}
          useNativeControls
          isMuted
          resizeMode="contain"
        />
      )}
      <View style={styles.buttonRow}>
        <Button title="Add Image" onPress={pickImage} />
        <Button title="Add Video" onPress={pickVideo} />
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
    height: 200,
    borderRadius: 6,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },

});
