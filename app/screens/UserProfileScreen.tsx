import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Image, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

export default function UserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) setProfile(data);
    };
    load();
  }, [userId]);

  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: 'white' }}>Loading...</Text>
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
  container: { flex: 1, padding: 20, backgroundColor: colors.background },
  backButton: { alignSelf: 'flex-start', marginBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  banner: { width: '100%', height: Dimensions.get('window').height * 0.25, marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  placeholder: { backgroundColor: '#ffffff20' },
  textContainer: { marginLeft: 15 },
  username: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  name: { color: 'white', fontSize: 20, marginTop: 4 },

});
