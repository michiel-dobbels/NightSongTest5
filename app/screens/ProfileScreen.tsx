import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { profile } = useAuth() as any;
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      const uri = await AsyncStorage.getItem(`profile_pic_${profile.id}`);
      if (uri) setImageUri(uri);
    };
    load();
  }, [profile]);

  const pickImage = async () => {
    let { granted } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!granted) {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      granted = permission.granted;
    }
    if (!granted) {
      alert('Permission to access images is required!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      if (profile) {
        await AsyncStorage.setItem(`profile_pic_${profile.id}`, uri);
      }
    }
  };

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <View style={styles.backButton}>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.headerRow}>
        <Image
          source={
            imageUri ? { uri: imageUri } : require('../../assets/logo.png')
          }
          style={styles.avatar}
        />
        <Button title="Upload Profile Picture" onPress={pickImage} />
      </View>

      <Text style={styles.username}>@{profile.username}</Text>
      {profile.display_name && (
        <Text style={styles.name}>{profile.display_name}</Text>
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
});
