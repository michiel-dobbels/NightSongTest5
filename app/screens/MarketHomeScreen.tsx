import React, { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';
import MarketHeader from '../components/MarketHeader';
import ListingCard, { Listing } from '../components/ListingCard';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BOTTOM_NAV_HEIGHT = SCREEN_HEIGHT * 0.1;
const FAB_BOTTOM_OFFSET = (BOTTOM_NAV_HEIGHT + 10) * 1.11;





const mockListings: Listing[] = [
  {
    id: '1',
    title: 'iPhone 16 Pro Max',
    price: 110,
    image_urls: ['https://example.com/iphone.jpg'],
  },
  {
    id: '2',
    title: 'MacBook Air',
    price: 320,
    image_urls: ['https://example.com/macbook.jpg'],
  },
];

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
    <ListingCard
      listing={item}
      onPress={() => navigation.navigate('ListingDetail', { listing: item })}
    />
  );

  return (
    <View style={styles.container}>
      <MarketHeader />
      <FlatList
        data={listings.length > 0 ? listings : mockListings}
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
