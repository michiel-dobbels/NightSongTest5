import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Button,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../styles/colors';
import { supabase } from '../../lib/supabase';
import ImageCarousel from '../components/ImageCarousel';

export default function MarketListingDetailScreen() {
  const { params } = useRoute<any>();
  const navigation = useNavigation<any>();
  const listing = params?.listing;
  const [deleteVisible, setDeleteVisible] = useState(false);

  useEffect(() => {
    if (listing?.id) {
      supabase.rpc('increment_listing_views', { p_listing_id: listing.id });
    }
  }, [listing?.id]);

  const confirmDelete = async () => {
    if (!listing?.id) return;

    const { error } = await supabase
      .from('market_listings')
      .delete()
      .eq('id', listing.id);

    if (error) {
      console.error('Deletion error:', error);
      return;
    }

    setDeleteVisible(false);
      console.log('Trying to call onDelete with ID:', listing.id);

      params?.onDelete?.(listing.id);
      navigation.replace('MarketHome');



  };


  if (!listing) return null;

  return (
    <ScrollView style={styles.container}>
      <ImageCarousel images={listing.image_urls || []} height={250} />
      <View style={styles.content}>
        <Text style={styles.price}>{`$${listing.price ?? ''}`}</Text>
        {listing.title && <Text style={styles.title}>{listing.title}</Text>}
        {listing.brand && (
          <Text style={styles.desc}>{`Brand: ${listing.brand}`}</Text>
        )}
        {listing.model && (
          <Text style={styles.desc}>{`Model: ${listing.model}`}</Text>
        )}
        {listing.year !== null && (
          <Text style={styles.desc}>{`Year: ${listing.year}`}</Text>
        )}
        {listing.vehicle_type && (
          <Text style={styles.desc}>{`Type: ${listing.vehicle_type}`}</Text>
        )}
        {listing.location && (
          <Text style={styles.desc}>{`Location: ${listing.location}`}</Text>
        )}
        {listing.mileage !== null && (
          <Text style={styles.desc}>{`Mileage: ${listing.mileage}`}</Text>
        )}
        {listing.fuel_type && (
          <Text style={styles.desc}>{`Fuel: ${listing.fuel_type}`}</Text>
        )}
        {listing.transmission && (
          <Text style={styles.desc}>{`Transmission: ${listing.transmission}`}</Text>
        )}
        {listing.views !== undefined && (
          <Text style={styles.desc}>{`Views: ${listing.views}`}</Text>
        )}
        {listing.favorites !== undefined && (
          <Text style={styles.desc}>{`Favorites: ${listing.favorites}`}</Text>
        )}
        {listing.description && (
          <Text style={styles.desc}>{listing.description}</Text>
        )}
        <Button
          title="Edit Listing"
          onPress={() => navigation.navigate('EditListing', { listing })}
          color={colors.accent}
        />
        <View style={{ height: 10 }} />
        <Button
          title="Delete Listing"
          onPress={() => setDeleteVisible(true)}
          color="red"
        />
      </View>
      <Modal visible={deleteVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              Are you sure you want to delete this listing?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 10 },
  price: { color: colors.accent, fontSize: 20, marginBottom: 6 },
  title: { color: colors.text, fontSize: 18, marginBottom: 10 },
  desc: { color: colors.text },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 8,
    width: '80%',
  },
  modalText: { color: colors.text, marginBottom: 20, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { padding: 10, flex: 1, alignItems: 'center', borderRadius: 6 },
  cancelButton: { marginRight: 10, backgroundColor: '#555' },
  deleteButton: { marginLeft: 10, backgroundColor: 'red' },
  cancelText: { color: colors.text },
  deleteText: { color: colors.text },
});
