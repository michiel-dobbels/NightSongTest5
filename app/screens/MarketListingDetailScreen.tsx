import React from 'react';
import { ScrollView, Text, Image, StyleSheet, Button } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../styles/colors';

export default function MarketListingDetailScreen() {
  const { params } = useRoute<any>();
  const navigation = useNavigation<any>();
  const listing = params?.listing;

  if (!listing) return null;

  return (
    <ScrollView style={styles.container}>
      {listing.image_urls?.map((url: string) => (
        <Image key={url} source={{ uri: url }} style={styles.image} />
      ))}
      <Text style={styles.price}>{`$${listing.price ?? ''}`}</Text>
      <Text style={styles.title}>
        {listing.brand} {listing.model} {listing.year}
      </Text>
      {listing.location && <Text style={styles.desc}>{listing.location}</Text>}
      {listing.mileage !== null && (
        <Text style={styles.desc}>{`Mileage: ${listing.mileage}`}</Text>
      )}
      {listing.fuel_type && (
        <Text style={styles.desc}>{`Fuel: ${listing.fuel_type}`}</Text>
      )}
      {listing.transmission && (
        <Text style={styles.desc}>{`Transmission: ${listing.transmission}`}</Text>
      )}
      <Text style={styles.desc}>{listing.description}</Text>
      <Button
        title="Edit Listing"
        onPress={() => navigation.navigate('EditListing', { listing })}
        color={colors.accent}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 10 },
  image: { width: '100%', height: 250, borderRadius: 8, marginBottom: 10 },
  price: { color: colors.accent, fontSize: 20, marginBottom: 6 },
  title: { color: colors.text, fontSize: 18, marginBottom: 10 },
  desc: { color: colors.text },
});
