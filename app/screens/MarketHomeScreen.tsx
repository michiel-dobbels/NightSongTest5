

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
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
  isPlaceholder?: boolean;
}

export default function MarketHomeScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [placeholderListing, setPlaceholderListing] = useState<Partial<Listing> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const skipNextLoad = useRef(false); // ✅ new ref

  const load = async () => {
    const { data } = await supabase
      .from('market_listings')
      .select('*')
      .order('created_at', { ascending: false });

    setListings(data ?? []);
  };

  useFocusEffect(
    useCallback(() => {
      if (skipNextLoad.current) {
        console.log('⏭️ Skipping load() after deletion');
        skipNextLoad.current = false;
        return;
      }

      load();
    }, [])
  );

  useEffect(() => {
    if (route.params?.placeholderListing) {
      setPlaceholderListing(route.params.placeholderListing);
      navigation.setParams({ placeholderListing: undefined });
    }
  }, [route.params?.placeholderListing]);

  const handleDelete = (deletedId: string) => {
    skipNextLoad.current = true; // ✅ mark that next load should be skipped
    setListings((prev) => prev.filter((l) => l.id !== deletedId));
    setPlaceholderListing(null);
    setRefreshKey((k) => k + 1);
  };

  const renderItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      style={[styles.card, item.isPlaceholder && styles.placeholderOpacity]}
      onPress={() => {
        if (!item.isPlaceholder) {
          navigation.navigate('ListingDetail', {
            listing: item,
            onDelete: handleDelete,
          });
        }
      }}
      activeOpacity={item.isPlaceholder ? 1 : 0.2}
    >
      {item.image_urls?.[0] ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: item.image_urls[0] }}
            style={styles.image}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.overlay}
          >
            <Text style={styles.price}>€ {item.price ?? ''}</Text>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {item.title || ''}
            </Text>
          </LinearGradient>
        </View>
      ) : (
        <View style={styles.placeholderImage} />
      )}
    </TouchableOpacity>
  );

  const dataToRender = placeholderListing
    ? ([placeholderListing, ...listings] as Listing[])
    : listings;

  return (
    <View style={styles.container}>
      <MarketHeader />

      {dataToRender.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <Text style={styles.emptyText}>No listings found</Text>
        </View>
      ) : (
        <>
          {console.log('Listings rendered:', listings.map((l) => l.id))}
          <FlatList
            data={dataToRender}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            extraData={refreshKey}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            contentContainerStyle={{ padding: 10 }}
            showsVerticalScrollIndicator={false}
          />
        </>
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
    marginBottom: 12,
    width: '48%',
  },
  imageWrapper: { position: 'relative' },
  image: { width: '100%', aspectRatio: 1, borderRadius: 6 },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    paddingHorizontal: 6,
    paddingBottom: 4,
    justifyContent: 'flex-end',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  price: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  title: { color: colors.text, fontSize: 14 },
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
  placeholderImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 6,
    backgroundColor: '#555',
  },
  placeholderOpacity: {
    opacity: 0.5,
  },
});
