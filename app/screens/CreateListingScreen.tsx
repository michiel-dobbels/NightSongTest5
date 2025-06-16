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
            description,
            price: parseFloat(price),
            location,
            brand,
            model,
            year: year ? parseInt(year, 10) : null,
            mileage: mileage ? parseInt(mileage, 10) : null,
            vehicle_type: vehicleType || null,
            fuel_type: fuelType || null,
            transmission: transmission || null,

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

