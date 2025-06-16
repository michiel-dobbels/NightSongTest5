import React, { useEffect } from 'react';
import { ScrollView, Text, StyleSheet, Button } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../styles/colors';
import { supabase } from '../../lib/supabase';
import ImageCarousel from '../components/ImageCarousel';

export default function MarketListingDetailScreen() {
  const { params } = useRoute<any>();
  const navigation = useNavigation<any>();
  const listing = params?.listing;

  useEffect(() => {
    if (listing?.id) {
      supabase.rpc('increment_listing_views', { p_listing_id: listing.id });
    }
  }, [listing?.id]);

  if (!listing) return null;

  return (
    <ScrollView style={styles.container}>
      <ImageCarousel images={listing.image_urls || []} height={250} />
      <Text style={styles.price}>{`$${listing.price ?? ''}`}</Text>
      {listing.title && <Text style={styles.title}>{listing.title}</Text>}
      {listing.brand && (
        <Text style={styles.desc}>{`Brand: ${listing.brand}`}</Text>
      )}
      {listing.model && (
        <Text style={styles.desc}>{`Model: ${listing.model}`}</Text>
      )}
      {listing.year !== null && (
        <Text style={styles.desc}>{`Year: ${listing.year}`}</Text>
      )}
      {listing.vehicle_type && (
        <Text style={styles.desc}>{`Type: ${listing.vehicle_type}`}</Text>
      )}
      {listing.location && (
        <Text style={styles.desc}>{`Location: ${listing.location}`}</Text>
      )}
      {listing.mileage !== null && (
        <Text style={styles.desc}>{`Mileage: ${listing.mileage}`}</Text>
      )}
      {listing.fuel_type && (
        <Text style={styles.desc}>{`Fuel: ${listing.fuel_type}`}</Text>
      )}
      {listing.transmission && (
        <Text style={styles.desc}>{`Transmission: ${listing.transmission}`}</Text>
      )}
      {listing.views !== undefined && (
        <Text style={styles.desc}>{`Views: ${listing.views}`}</Text>
      )}
      {listing.favorites !== undefined && (
        <Text style={styles.desc}>{`Favorites: ${listing.favorites}`}</Text>
      )}
      {listing.description && (
        <Text style={styles.desc}>{listing.description}</Text>
      )}
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
  price: { color: colors.accent, fontSize: 20, marginBottom: 6 },
  title: { color: colors.text, fontSize: 18, marginBottom: 10 },
  desc: { color: colors.text },
});
