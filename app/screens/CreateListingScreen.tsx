import React, { useState } from 'react';
import {
  ScrollView,
  TextInput,
  Button,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const TOP_OFFSET = SCREEN_HEIGHT * 0.2;

export default function CreateListingScreen() {
  const { user } = useAuth()!;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState('');
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
      image_urls: publicUrl ? [publicUrl] : [],
    });
    setTitle('');
    setDescription('');
    setPrice('');
    setLocation('');
    setBrand('');
    setModel('');
    setYear('');
    setMileage('');
    setVehicleType('');
    setFuelType('');
    setTransmission('');
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
      <Button title="Create Listing" onPress={handleCreate} color={colors.accent} />
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
