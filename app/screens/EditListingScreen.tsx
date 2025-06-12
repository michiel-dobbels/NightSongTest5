import React, { useState } from 'react';
import { ScrollView, TextInput, Button, StyleSheet, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

export default function EditListingScreen() {
  const { params } = useRoute<any>();
  const navigation = useNavigation<any>();
  const listing = params?.listing;

  const [title, setTitle] = useState(listing?.title || '');
  const [price, setPrice] = useState(String(listing?.price ?? ''));
  const [brand, setBrand] = useState(listing?.brand || '');
  const [model, setModel] = useState(listing?.model || '');
  const [year, setYear] = useState(String(listing?.year ?? ''));
  const [image, setImage] = useState<string | null>(listing?.image_urls?.[0] || null);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.canceled) {
      setImage(res.assets[0].uri);
    }
  };

  const handleSave = async () => {
    let url = image;
    if (image && !image.startsWith('http')) {
      const ext = image.split('.').pop();
      const path = `${listing.id}-${Date.now()}.${ext}`;
      const resp = await fetch(image);
      const blob = await resp.blob();
      const { error } = await supabase.storage.from('marketplace').upload(path, blob, { upsert: true });
      if (!error) {
        url = supabase.storage.from('marketplace').getPublicUrl(path).data.publicUrl;
      }
    }
    await supabase
      .from('market_listings')
      .update({
        title,
        price: parseFloat(price),
        brand,
        model,
        year: parseInt(year, 10),
        image_urls: url ? [url] : [],
      })
      .eq('id', listing.id);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <Button title="Change Image" onPress={pickImage} color={colors.accent} />
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
      <TextInput
        placeholder="Brand"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={brand}
        onChangeText={setBrand}
      />
      <TextInput
        placeholder="Model"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={model}
        onChangeText={setModel}
      />
      <TextInput
        placeholder="Year"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={year}
        onChangeText={setYear}
        keyboardType="numeric"
      />
      <Button title="Save" onPress={handleSave} color={colors.accent} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  input: {
    backgroundColor: '#333',
    color: colors.text,
    padding: 8,
    borderRadius: 4,
    marginTop: 10,
  },
  image: { width: '100%', height: 200, marginTop: 10, borderRadius: 6 },
});
