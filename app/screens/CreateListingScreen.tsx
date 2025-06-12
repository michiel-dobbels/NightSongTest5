import React, { useState } from 'react';
import { ScrollView, TextInput, Button, StyleSheet, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

export default function CreateListingScreen() {
  const { user } = useAuth()!;
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [image, setImage] = useState<string | null>(null);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.canceled) {
      setImage(res.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    let publicUrl: string | null = null;
    if (image) {
      const ext = image.split('.').pop();
      const path = `${user.id}-${Date.now()}.${ext}`;
      const resp = await fetch(image);
      const blob = await resp.blob();
      const { error } = await supabase.storage.from('marketplace').upload(path, blob);
      if (!error) {
        publicUrl = supabase.storage.from('marketplace').getPublicUrl(path).data.publicUrl;
      }
    }
    await supabase.from('market_listings').insert({
      user_id: user.id,
      title,
      price: parseFloat(price),
      brand,
      model,
      year: parseInt(year, 10),
      image_urls: publicUrl ? [publicUrl] : [],
    });
    setTitle('');
    setPrice('');
    setBrand('');
    setModel('');
    setYear('');
    setImage(null);
  };

  return (
    <ScrollView style={styles.container}>
      <Button title="Pick Image" onPress={pickImage} color={colors.accent} />
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
      <Button title="Create Listing" onPress={handleCreate} color={colors.accent} />
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
