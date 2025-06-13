import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';

interface ListingPreviewCardProps {
  imageUri: string;
  title: string;
  price: string;
}

export default function ListingPreviewCard({
  imageUri,
  title,
  price,
}: ListingPreviewCardProps) {
  const formattedPrice = price ? `€${parseFloat(price).toFixed(2)}` : '';

  return (
    <View style={styles.card}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        <Text style={styles.price}>{formattedPrice}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '60%',
    aspectRatio: 1,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 12,
    backgroundColor: '#333',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  title: { color: colors.text, fontWeight: '600' },
  price: { color: colors.accent, fontSize: 16, marginTop: 2 },
});
