import React, { useState } from 'react';
import {
  ScrollView,
  TextInput,
  Button,
  StyleSheet,
  Dimensions,
  View,
  Text,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';
import ListingImagePicker from '../components/ListingImagePicker';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const TOP_OFFSET = SCREEN_HEIGHT * 0.2;
const BOTTOM_NAV_HEIGHT = SCREEN_HEIGHT * 0.1;
const BOTTOM_OFFSET = BOTTOM_NAV_HEIGHT * 1.5;

export default function CreateListingScreen() {
  const auth = useAuth();
  const user = auth?.user;

  const navigation = useNavigation<any>();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [createdListing, setCreatedListing] = useState<any | null>(null);

  const handleCreate = async () => {
    if (!user || !title || !price || images.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('market_listings')
        .insert([
          {
            user_id: user.id,
            title,
            price: parseFloat(price),
            image_urls: images,
          },
        ])
        .select('*')
        .single();

      if (error) throw error;

      setCreatedListing(data);
      navigation.navigate('MarketHome');
    } catch (err) {
      console.error('Image or Listing creation failed:', err);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: BOTTOM_OFFSET }}>
      {user && <ListingImagePicker userId={user.id} onChange={setImages} />}

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
          <Text style={styles.previewPrice}>€ {createdListing.price ?? ''}</Text>
          <Text style={styles.previewTitle} numberOfLines={1} ellipsizeMode="tail">
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
  previewCard: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 12,
    width: '48%',
    alignSelf: 'center',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 6,
  },
  previewPrice: {
    color: colors.accent,
    fontSize: 18,
    marginTop: 6,
  },
  previewTitle: {
    color: colors.text,
    marginTop: 4,
  },
});

