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
import { useNavigation, useRoute } from '@react-navigation/native';
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
  const route = useRoute<any>();
  const [placeholderListing, setPlaceholderListing] = useState<
    Partial<Listing> | null
  >(null);

  const load = async () => {
    const { data } = await supabase
      .from('market_listings')
      .select('*')
      .order('created_at', { ascending: false });
    setListings((data as Listing[]) ?? []);
  };

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (route.params?.placeholderListing) {
      setPlaceholderListing(route.params.placeholderListing);
      navigation.setParams({ placeholderListing: undefined });
    }
  }, [route.params?.placeholderListing]);

  const renderItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ListingDetail', { listing: item })}
    >
      {item.image_urls && item.image_urls[0] ? (
        <Image
          source={{ uri: item.image_urls[0] }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.placeholderImage]} />
      )}
      <View style={styles.textOverlay}>
        <Text style={styles.price}>{`€ ${item.price ?? ''}`}</Text>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {item.title || ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const dataToRender = placeholderListing
    ? ([placeholderListing, ...listings] as Listing[])
    : listings;

  return (
    <View style={styles.container}>
      <MarketHeader />
      {dataToRender.length === 0 ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}

          keyExtractor={item => item.toString()}
          renderItem={() => (
            <View style={styles.placeholderCard}>
              <View style={[styles.image, styles.placeholderImage]} />
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
              <Text style={styles.emptyText}>No listings found</Text>

            </View>
          }
        />
      ) : (
        <FlatList
          data={dataToRender}
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
    width: '48%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#333',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  image: { width: '100%', height: '100%', position: 'absolute' },
  textOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  price: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  title: { color: '#fff' },
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
    borderRadius: 10,
    marginBottom: 12,
    width: '48%',
  },
  placeholderImage: {
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
