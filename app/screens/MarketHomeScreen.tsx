import React, { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';
import MarketHeader from '../components/MarketHeader';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BOTTOM_NAV_HEIGHT = SCREEN_HEIGHT * 0.1;
const FAB_BOTTOM_OFFSET = (BOTTOM_NAV_HEIGHT + 10) * 1.11;




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
  const [listings, setListings] = useState<Listing[]>([]);
  const navigation = useNavigation<any>();

  const load = async () => {
    const { data } = await supabase
      .from('market_listings')
      .select('*')
      .order('created_at', { ascending: false });
    setListings((data as Listing[]) ?? []);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const renderItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ListingDetail', { listing: item })}
    >
      {item.image_urls && item.image_urls[0] && (
        <Image
          source={{ uri: item.image_urls[0] }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      <Text style={styles.price}>{`€ ${item.price ?? ''}`}</Text>
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {item.title || ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <MarketHeader />
      {listings.length === 0 ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          keyExtractor={item => item.toString()}
          renderItem={() => (
            <View style={styles.placeholderCard}>
              <View style={styles.placeholderImage} />
              <View style={styles.placeholderLine} />
              <View style={styles.placeholderLineShort} />
            </View>
          )}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ padding: 10 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={styles.emptyWrapper}>
              <Text style={styles.emptyText}>No listings yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ padding: 10 }}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { color: colors.text, marginTop: 20 },
  placeholderCard: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    width: '48%',
  },
  placeholderImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 6,
    backgroundColor: '#555',
  },
  placeholderLine: {
    height: 18,
    backgroundColor: '#555',
    borderRadius: 4,
    marginTop: 6,
  },
  placeholderLineShort: {
    height: 14,
    backgroundColor: '#555',
    borderRadius: 4,
    marginTop: 4,
    width: '80%',
  },
});
