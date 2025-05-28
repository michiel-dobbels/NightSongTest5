import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { profile } = useAuth() as any;
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access photos is required!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <View style={styles.backButton}>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
      <Text style={styles.username}>@{profile.username}</Text>
      {profile.display_name && (
        <Text style={styles.name}>{profile.display_name}</Text>
      )}
      <TouchableOpacity onPress={pickImage} style={styles.uploadLink}>
        <Text style={styles.uploadText}>Upload Profile Picture</Text>
      </TouchableOpacity>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  username: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  name: {
    color: 'white',
    fontSize: 20,

  },
  uploadLink: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#ffffff10',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  uploadText: { color: 'white' },
  image: { width: 100, height: 100, borderRadius: 50, marginTop: 20 },
});
