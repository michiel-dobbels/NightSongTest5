import React, { useState } from 'react';
import {
  ScrollView,
  TextInput,
  Button,
  StyleSheet,
  Image,
  Dimensions,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { supabase, MARKET_BUCKET } from '../../lib/supabase';
import { colors } from '../styles/colors';
import ListingCard, { Listing } from '../components/ListingCard';

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
  const [createdListing, setCreatedListing] = useState<Listing | null>(null);

  const processAsset = async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<string> => {
    const size = Math.min(asset.width ?? 0, asset.height ?? 0);
    const cropped = await manipulateAsync(
      asset.uri,
      [
        {
          crop: {
            originX: ((asset.width ?? size) - size) / 2,
            originY: ((asset.height ?? size) - size) / 2,
            width: size,
            height: size,
          },
        },
        { resize: { width: 512, height: 512 } },
      ],
      { compress: 0.9, format: SaveFormat.JPEG },
    );
    return cropped.uri;
  };


  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!res.canceled) {
      const uri = await processAsset(res.assets[0]);
      setImage(uri);
    }

  };

  const takePhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!res.canceled) {
      const uri = await processAsset(res.assets[0]);
      setImage(uri);
    }
  };

  const uploadImage = async (uri: string) => {
    const ext = uri.split('.').pop();
    const path = `${user!.id}-${Date.now()}.${ext}`;
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const { error } = await supabase.storage.from(MARKET_BUCKET).upload(path, blob);
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
    const { data, error } = await supabase
      .from('market_listings')
      .insert({
        user_id: user.id,
        title,
        price: parseFloat(price),
        image_urls: publicUrl ? [publicUrl] : [],
      })
      .select()
      .single();
    if (error) {
      console.error('Create listing failed', error);
      return;
    }
    setCreatedListing(data as Listing);
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
      {image && <Image source={{ uri: image }} style={styles.image} />}
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
        <View style={{ marginTop: 20 }}>
          <ListingCard listing={createdListing} onPress={() => {}} />
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
  image: { width: '100%', height: 200, marginTop: 10, borderRadius: 6 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
});
