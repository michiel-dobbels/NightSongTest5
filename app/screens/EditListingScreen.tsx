import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, ScrollView, Image, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

interface RouteParams { id: string }

export default function EditListingScreen() {
  const route = useRoute();
  const { id } = route.params as RouteParams;
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadListing = async () => {
      const { data, error } = await supabase
        .from('market_listings')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        setTitle(data.title || '');
        setDescription(data.description || '');
        setPrice(String(data.price ?? ''));
        setBrand(data.brand || '');
        setModel(data.model || '');
        setYear(String(data.year ?? ''));
        setImages(data.image_urls || []);
      }
    };
    loadListing();
  }, [id]);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true });
    if (!result.canceled) {
      const assets = (result.assets ?? []) as any[];
      setImages(assets.map((a) => a.uri));
    }
  };

  const handleSave = async () => {
    setUploading(true);
    const urls: string[] = [];
    for (const uri of images) {
      if (uri.startsWith('http')) {
        urls.push(uri);
        continue;
      }
      const file = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage
        .from('market-images')
        .upload(fileName, Buffer.from(file, 'base64'), { contentType: 'image/jpeg' });
      if (!error) {
        const { data } = supabase.storage.from('market-images').getPublicUrl(fileName);
        urls.push(data.publicUrl);
      }
    }
    const { error } = await supabase
      .from('market_listings')
      .update({
        title,
        description,
        price: Number(price),
        brand,
        model,
        year: Number(year),
        image_urls: urls,
      })
      .eq('id', id);
    if (error) console.error('Failed to update listing', error);
    setUploading(false);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextInput placeholder="Title" placeholderTextColor="#999" value={title} onChangeText={setTitle} style={styles.input} />
      <TextInput
        placeholder="Description"
        placeholderTextColor="#999"
        value={description}
        onChangeText={setDescription}
        style={[styles.input, styles.multiline]}
        multiline
      />
      <TextInput placeholder="Price" placeholderTextColor="#999" value={price} onChangeText={setPrice} keyboardType="numeric" style={styles.input} />
      <TextInput placeholder="Brand" placeholderTextColor="#999" value={brand} onChangeText={setBrand} style={styles.input} />
      <TextInput placeholder="Model" placeholderTextColor="#999" value={model} onChangeText={setModel} style={styles.input} />
      <TextInput placeholder="Year" placeholderTextColor="#999" value={year} onChangeText={setYear} keyboardType="numeric" style={styles.input} />
      <TouchableOpacity style={styles.imagePicker} onPress={pickImages}>
        <Text style={styles.imagePickerText}>Pick Images</Text>
      </TouchableOpacity>
      <View style={styles.previewRow}>
        {images.map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.preview} />
        ))}
      </View>
      {uploading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Button title="Save" onPress={handleSave} color={colors.accent} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  input: {
    backgroundColor: '#444',
    color: colors.text,
    padding: 8,
    marginBottom: 10,
    borderRadius: 4,
  },
  multiline: { height: 80 },
  imagePicker: {
    backgroundColor: colors.accent,
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    alignItems: 'center',
  },
  imagePickerText: { color: '#fff', fontWeight: 'bold' },
  previewRow: { flexDirection: 'row', flexWrap: 'wrap' },
  preview: { width: 60, height: 60, marginRight: 6, marginBottom: 6 },
});
