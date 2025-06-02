import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Button, Dimensions, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  image_url: string | null;
  banner_url: string | null;
}

export default function UserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId, avatarUrl } = route.params as {
    userId: string;
    avatarUrl?: string | null;
  };
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setNotFound(false);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, image_url, banner_url')
        .eq('id', userId)
        .single();
      if (data) {
        setProfile(data as Profile);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="white" />
      </View>
    );
  }

  if (notFound || !profile) {
    return (
      <View style={[styles.container, styles.center]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]} />
        )}
        <Text style={{ color: 'white', marginTop: 10 }}>Profile not found.</Text>
        <View style={styles.backButton}>
          <Button title="Back" onPress={() => navigation.goBack()} />
        </View>

      </View>
    );
  }

  return (
    <View style={styles.container}>
      {profile.banner_url ? (
        <Image source={{ uri: profile.banner_url }} style={styles.banner} />
      ) : (
        <View style={[styles.banner, styles.placeholder]} />
      )}
      <View style={styles.backButton}>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.profileRow}>
        {profile.image_url ? (
          <Image source={{ uri: profile.image_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]} />
        )}
        <View style={styles.textContainer}>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.display_name && <Text style={styles.name}>{profile.display_name}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  banner: {
    width: '100%',
    height: Dimensions.get('window').height * 0.25,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  placeholder: { backgroundColor: '#ffffff20' },
  textContainer: { marginLeft: 15 },
  username: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  name: { color: 'white', fontSize: 20, marginTop: 4 },
  center: { justifyContent: 'center', alignItems: 'center' },
});
