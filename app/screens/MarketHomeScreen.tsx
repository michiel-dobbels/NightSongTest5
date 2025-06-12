import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

interface Listing {
  id: string;
  image_urls: string[] | null;
  price: number | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  description?: string | null;
  location?: string | null;
  mileage?: number | null;
  vehicle_type?: string | null;
  fuel_type?: string | null;
  transmission?: string | null;
}

export default function MarketHomeScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('market_listings')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setListings(data as Listing[]);
    };
    load();
  }, []);

  const renderItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ListingDetail', { listing: item })}
    >
      {item.image_urls && item.image_urls[0] && (
        <Image source={{ uri: item.image_urls[0] }} style={styles.image} />
      )}
      <Text style={styles.price}>{`$${item.price ?? ''}`}</Text>
      <Text style={styles.title}>
        {item.brand} {item.model} {item.year}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10 }}
      />
      <TouchableOpacity
        onPress={() => navigation.navigate('CreateListing')}
        style={styles.fab}
      >
        <Text style={{ color: colors.text, fontSize: 24 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  image: { width: '100%', height: 150, borderRadius: 6 },
  price: { color: colors.accent, fontSize: 18, marginTop: 6 },
  title: { color: colors.text, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: colors.accent,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
});
