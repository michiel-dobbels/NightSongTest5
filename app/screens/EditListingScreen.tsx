import React, { useState } from 'react';
import {
  ScrollView,
  TextInput,
  Button,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase, MARKET_BUCKET } from '../../lib/supabase';
import { colors } from '../styles/colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const TOP_OFFSET = SCREEN_HEIGHT * 0.2;
const BOTTOM_NAV_HEIGHT = SCREEN_HEIGHT * 0.1;
const BOTTOM_OFFSET = BOTTOM_NAV_HEIGHT * 1.5;


export default function EditListingScreen() {
  const { params } = useRoute<any>();
  const navigation = useNavigation<any>();
  const listing = params?.listing;

  const [title, setTitle] = useState(listing?.title || '');
  const [description, setDescription] = useState(listing?.description || '');
  const [price, setPrice] = useState(String(listing?.price ?? ''));
  const [location, setLocation] = useState(listing?.location || '');
  const [brand, setBrand] = useState(listing?.brand || '');
  const [model, setModel] = useState(listing?.model || '');
  const [year, setYear] = useState(String(listing?.year ?? ''));
  const [mileage, setMileage] = useState(String(listing?.mileage ?? ''));
  const [vehicleType, setVehicleType] = useState(listing?.vehicle_type || '');
  const [fuelType, setFuelType] = useState(listing?.fuel_type || '');
  const [transmission, setTransmission] = useState(listing?.transmission || '');
  const [image, setImage] = useState<string | null>(listing?.image_urls?.[0] || null);

  const processImage = async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<string> => {
    const width = asset.width || 1;
    const height = asset.height || 1;
    const size = Math.min(width, height);
    const result = await ImageManipulator.manipulateAsync(
      asset.uri,
      [
        {
          crop: {
            originX: (width - size) / 2,
            originY: (height - size) / 2,
            width: size,
            height: size,
          },
        },
      ],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.canceled) {
      const uri = await processImage(res.assets[0]);
      setImage(uri);
    }
  };

  const handleSave = async () => {
    let url = image;
    if (image && !image.startsWith('http')) {
      const ext = image.split('.').pop();
      const path = `${listing.id}-${Date.now()}.${ext}`;
      const resp = await fetch(image);
      const blob = await resp.blob();
      const { error } = await supabase.storage.from(MARKET_BUCKET).upload(path, blob, { upsert: true });
      if (!error) {
        url = supabase.storage.from(MARKET_BUCKET).getPublicUrl(path).data.publicUrl;
      }
    }
    await supabase
      .from('market_listings')
      .update({
        title,
        description,
        price: parseFloat(price),
        location,
        brand,
        model,
        year: parseInt(year, 10),
        mileage: mileage ? parseInt(mileage, 10) : null,
        vehicle_type: vehicleType || null,
        fuel_type: fuelType || null,
        transmission: transmission || null,
        image_urls: url ? [url] : [],
      })
      .eq('id', listing.id);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: BOTTOM_OFFSET }}>
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
      <TextInput
        placeholder="Description"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        placeholder="Location"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={location}
        onChangeText={setLocation}
      />
      <TextInput
        placeholder="Mileage"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={mileage}
        onChangeText={setMileage}
        keyboardType="numeric"
      />
      <TextInput
        placeholder="Vehicle Type"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={vehicleType}
        onChangeText={setVehicleType}
      />
      <TextInput
        placeholder="Fuel Type"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={fuelType}
        onChangeText={setFuelType}
      />
      <TextInput
        placeholder="Transmission"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={transmission}
        onChangeText={setTransmission}
      />
      <Button title="Save" onPress={handleSave} color={colors.accent} />
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
});
