import React from 'react';
import { TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';

export interface Listing {
  id: string;
  title: string | null;
  price: number | null;
  image_urls: string[] | null;
}

export default function ListingCard({
  listing,
  onPress,
}: {
  listing: Listing;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {listing.image_urls?.[0] && (
        <Image
          source={{ uri: listing.image_urls[0] }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      <Text style={styles.price}>{`€ ${listing.price ?? ''}`}</Text>
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {listing.title || ''}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    width: '48%',
  },
  image: { width: '100%', aspectRatio: 1, borderRadius: 6 },
  price: { color: colors.accent, fontSize: 18, marginTop: 6 },
  title: { color: colors.text, marginTop: 4 },
});
