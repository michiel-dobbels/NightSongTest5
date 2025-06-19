import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  Modal,
  Button,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Text,
  PanResponder,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase, MARKET_BUCKET } from '../../lib/supabase';
import { colors } from '../styles/colors';

interface ListingImagePickerProps {
  userId: string;
  onChange: (urls: string[]) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

const uploadImage = async (uri: string, userId: string): Promise<string> => {
  const ext = uri.split('.').pop();
  const path = `${userId}_${Date.now()}.${ext}`;

  const { uri: fileUri } = await FileSystem.getInfoAsync(uri);
  if (!fileUri) throw new Error('File not found');

  const file = {
    uri: fileUri,
    name: path,
    type: `image/${ext}`,
  } as any;

  const { error } = await supabase.storage
    .from(MARKET_BUCKET)
    .upload(path, file, { upsert: true, contentType: `image/${ext}` });

  if (error) throw error;

  const { publicURL } = supabase.storage.from(MARKET_BUCKET).getPublicUrl(path);
  if (!publicURL) throw new Error('Failed to get public URL');
  return publicURL;
};

export default function ListingImagePicker({ userId, onChange }: ListingImagePickerProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -20) goNext();
        else if (g.dx > 20) goPrev();
      },
    })
  ).current;

  const pickImages = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
    });

    if (!res.canceled) {
      const urls: string[] = [];
      for (const asset of res.assets) {
        const url = await uploadImage(asset.uri, userId);
        urls.push(url);
      }
      setImageUrls(prev => {
        const updated = [...prev, ...urls];
        onChange(updated);
        return updated;
      });
    }
  };

  const openViewer = (index: number) => {
    setCurrentIndex(index);
    setViewerVisible(true);
  };

  const closeViewer = () => setViewerVisible(false);

  const goNext = () => {
    setCurrentIndex(i => (i + 1) % imageUrls.length);
  };

  const goPrev = () => {
    setCurrentIndex(i => (i - 1 + imageUrls.length) % imageUrls.length);
  };

  return (
    <View>
      <Button title="Add Images" onPress={pickImages} color={colors.accent} />
      <FlatList
        data={imageUrls}
        horizontal
        keyExtractor={(item, index) => item + index}
        renderItem={({ item, index }) => (
          <TouchableOpacity onPress={() => openViewer(index)}>
            <Image source={{ uri: item }} style={styles.thumbnail} />
          </TouchableOpacity>
        )}
        style={styles.list}
        contentContainerStyle={{ paddingVertical: 10 }}
      />

      <Modal visible={viewerVisible} transparent={true} onRequestClose={closeViewer}>
        <View style={styles.modalContainer} {...panResponder.panHandlers}>
          <Image
            source={{ uri: imageUrls[currentIndex] }}
            style={styles.fullImage}
            resizeMode="contain"
          />
          <TouchableWithoutFeedback onPress={goPrev}>
            <View style={styles.touchLeft} />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback onPress={goNext}>
            <View style={styles.touchRight} />
          </TouchableWithoutFeedback>
          <TouchableOpacity style={styles.closeBtn} onPress={closeViewer}>
            <Text style={styles.closeText}>X</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 10 },
  thumbnail: { width: 80, height: 80, marginRight: 8, borderRadius: 4 },
  modalContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  fullImage: { width: SCREEN_WIDTH, height: '100%' },
  touchLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
  },
  touchRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
  },
  closeBtn: { position: 'absolute', top: 40, right: 20, padding: 10 },
  closeText: { color: '#fff', fontSize: 18 },
});

