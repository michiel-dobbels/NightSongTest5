import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

interface RouteParams {
  id: string;
}

export default function MarketListingDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params as RouteParams;
  const [listing, setListing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListing = async () => {
      const { data, error } = await supabase
        .from('market_listings')
        .select('*')
        .eq('id', id)
        .single();
      if (error) console.error('Error loading listing', error);
      setListing(data);
      setLoading(false);
    };
    fetchListing();
  }, [id]);

  if (loading || !listing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const checkOwner = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      setIsOwner(uid === listing.user_id);
    };
    if (listing) checkOwner();
  }, [listing]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {listing.image_urls && listing.image_urls.length > 0 && (
        <Image source={{ uri: listing.image_urls[0] }} style={styles.image} />
      )}
      <Text style={styles.price}>${listing.price}</Text>
      <Text style={styles.title}>{listing.brand} {listing.model}</Text>
      <Text style={styles.year}>{listing.year}</Text>
      <Text style={styles.description}>{listing.description}</Text>
      {isOwner && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditListing', { id: listing.id })}
        >
          <Text style={styles.editText}>Edit Listing</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginBottom: 12,
  },
  price: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    marginBottom: 4,
  },
  year: {
    color: colors.text,
    marginBottom: 10,
  },
  description: {
    color: colors.text,
    marginBottom: 20,
  },
  editButton: {
    padding: 12,
    backgroundColor: colors.accent,
    borderRadius: 6,
    alignItems: 'center',
  },
  editText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
