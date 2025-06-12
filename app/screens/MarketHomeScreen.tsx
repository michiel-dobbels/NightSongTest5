import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

export interface MarketListing {
  id: string;
  title: string | null;
  price: number | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  image_urls: string[] | null;
}

export default function MarketHomeScreen() {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    let isMounted = true;
    const fetchListings = async () => {
      const { data, error } = await supabase
        .from('market_listings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('Error fetching listings', error);
      if (isMounted && data) setListings(data as MarketListing[]);
      setLoading(false);
    };
    fetchListings();
    return () => {
      isMounted = false;
    };
  }, []);

  const renderItem = ({ item }: { item: MarketListing }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
    >
      {item.image_urls && item.image_urls.length > 0 ? (
        <Image source={{ uri: item.image_urls[0] }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}
      <Text style={styles.price}>${item.price ?? ''}</Text>
      <Text style={styles.title} numberOfLines={1}>
        {item.brand} {item.model}
      </Text>
      {item.year && <Text style={styles.year}>{item.year}</Text>}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('CreateListing')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const BOTTOM_NAV_HEIGHT = Dimensions.get('window').height * 0.1;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    width: '48%',
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 4,
    marginBottom: 6,
  },
  placeholder: {
    backgroundColor: '#555',
  },
  price: {
    color: colors.accent,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  title: {
    color: colors.text,
  },
  year: {
    color: colors.text,
    opacity: 0.7,
    fontSize: 12,
  },
  addButton: {
    position: 'absolute',
    right: 16,
    bottom: BOTTOM_NAV_HEIGHT + 16,
    backgroundColor: colors.accent,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
