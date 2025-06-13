import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  TextInput,
  Button,
  StyleSheet,
  Image,
  Dimensions,
  View,
  Text,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { supabase, MARKET_BUCKET } from '../../lib/supabase';
import { colors } from '../styles/colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const TOP_OFFSET = SCREEN_HEIGHT * 0.2;
const BOTTOM_NAV_HEIGHT = SCREEN_HEIGHT * 0.1;
const BOTTOM_OFFSET = BOTTOM_NAV_HEIGHT * 1.5;

export default function CreateListingScreen() {
  const { user } = useAuth()!;
  const navigation = useNavigation<any>();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState<string | null>(null);
const [createdListing, setCreatedListing] = useState<any | null>(null);

  useEffect(() => {
    console.log('image state changed', image);
  }, [image]);

  const processImage = async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<string> => {
    console.log('picker asset uri', asset.uri);
    return asset.uri;
  };


  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!res.canceled) {
      const uri = await processImage(res.assets[0]);
      console.log('setting image from gallery', uri);
      setImage(uri);
    }
  };

  const takePhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!res.canceled) {
      const uri = await processImage(res.assets[0]);
      console.log('setting image from camera', uri);
      setImage(uri);
    }
  };

  const uploadImage = async (uri: string) => {
    const ext = uri.split('.').pop();
    const path = `${user!.id}-${Date.now()}.${ext}`;
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const { error } = await supabase.storage.from(MARKET_BUCKET).upload(path, blob, { upsert: true });
    if (error) throw error;
    return supabase.storage.from(MARKET_BUCKET).getPublicUrl(path).data.publicUrl;

  };

  const handleCreate = async () => {
    if (!user || !title || !price || !image) return;

    let publicUrl: string | null = null;
    try {
      publicUrl = await uploadImage(image);
    } catch (err) {
      console.error('Image upload failed', err);
    }

    const { data } = await supabase
      .from('market_listings')
      .insert({
        user_id: user.id,
        title,
        price: parseFloat(price),
        image_urls: publicUrl ? [publicUrl] : [],
      })
      .select('*')
      .single();

    setCreatedListing(data);
    navigation.goBack();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: BOTTOM_OFFSET }}
    >
      <View style={styles.buttonRow}>
        <Button title="Take Photo" onPress={takePhoto} color={colors.accent} />
        <Button title="Pick Image" onPress={pickFromGallery} color={colors.accent} />
      </View>
      {image && (
        <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
      )}
      <TextInput
        placeholder="Title"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        placeholder="Price"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />
      <Button title="Create Listing" onPress={handleCreate} color={colors.accent} />

      {createdListing && (
        <View style={styles.previewCard}>
          {createdListing.image_urls?.[0] && (
            <Image
              source={{ uri: createdListing.image_urls[0] }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          )}
          <Text style={styles.previewPrice}>{`€ ${createdListing.price ?? ''}`}</Text>
          <Text
            style={styles.previewTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {createdListing.title}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: TOP_OFFSET,
    backgroundColor: colors.background,
  },
  input: {
    backgroundColor: '#333',
    color: colors.text,
    padding: 8,
    borderRadius: 4,
    marginTop: 10,
  },
  image: { width: '100%', aspectRatio: 1, marginTop: 10, borderRadius: 6 },

  previewCard: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 12,
    width: '48%',
    alignSelf: 'center',

  },
  previewImage: { width: '100%', aspectRatio: 1, borderRadius: 6 },
  previewPrice: { color: colors.accent, fontSize: 18, marginTop: 6 },
  previewTitle: { color: colors.text, marginTop: 4 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
});
