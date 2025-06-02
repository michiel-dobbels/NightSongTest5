import React, { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet, Button } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

export default function UserProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { userId } = route.params as { userId: string };
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, image_url')
        .eq('id', userId)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [userId]);

  return (
    <View style={styles.container}>
      <View style={styles.backButton}>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
      {profile?.image_url ? (
        <Image source={{ uri: profile.image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 20 },
  backButton: { alignSelf: 'flex-start', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  placeholder: { backgroundColor: '#ccc' },
});
