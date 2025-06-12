import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BOTTOM_NAV_HEIGHT = SCREEN_HEIGHT * 0.1;
const FAB_BOTTOM_OFFSET = (BOTTOM_NAV_HEIGHT + 10) * 0.75;

const mockListings: Listing[] = [
  {
    id: '1',
    title: 'iPhone 16 Pro Max',
    price: 110,
    image_urls: ['https://example.com/iphone.jpg'],
    brand: null,
    model: null,
    year: null,
    description: null,
    location: null,
    mileage: null,
    vehicle_type: null,
    fuel_type: null,
    transmission: null,
    is_boosted: null,
    views: null,
    favorites: null,
    search_index: null,
  },
  {
    id: '2',
    title: 'MacBook Air',
    price: 320,
    image_urls: ['https://example.com/macbook.jpg'],
    brand: null,
    model: null,
    year: null,
    description: null,
    location: null,
    mileage: null,
    vehicle_type: null,
    fuel_type: null,
    transmission: null,
    is_boosted: null,
    views: null,
    favorites: null,
    search_index: null,
  },
];


interface Listing {
  id: string;
  image_urls: string[] | null;
  price: number | null;
  title: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  description?: string | null;
  location?: string | null;
  mileage?: number | null;
  vehicle_type?: string | null;
  fuel_type?: string | null;
  transmission?: string | null;
  is_boosted?: boolean | null;
  views?: number | null;
  favorites?: number | null;
  search_index?: string | null;
}

export default function MarketHomeScreen() {
  const [listings, setListings] = useState<Listing[]>(mockListings);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('market_listings')
        .select('*')
        .order('created_at', { ascending: false });
      if (data && data.length > 0) setListings(data as Listing[]);
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
      <Text style={styles.price}>{`€ ${item.price ?? ''}`}</Text>
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {item.title || ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ padding: 10 }}
        showsVerticalScrollIndicator={false}
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
    width: '48%',
  },
  image: { width: '100%', aspectRatio: 1, borderRadius: 6 },
  price: { color: colors.accent, fontSize: 18, marginTop: 6 },
  title: { color: colors.text, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: FAB_BOTTOM_OFFSET,
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
