import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Button, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';
import FollowButton from '../components/FollowButton';
import ProfileTabsNavigator from '../components/ProfileTabsNavigator';
import { useAuth } from '../../AuthContext';
import { useFollowCounts } from '../hooks/useFollowCounts';

export default function OtherUserProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();

  const { userId: routeUserId, username: routeUsername } = route.params || {};

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const idToLoad = profile?.id || routeUserId || null;
  const { followers, following, refresh } = useFollowCounts(idToLoad);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      setNotFound(false);
      let query = supabase.from('profiles').select('id, username, name, image_url, banner_url').single();
      if (routeUserId) query = query.eq('id', routeUserId);
      else if (routeUsername) query = query.eq('username', routeUsername);
      const { data, error } = await query;
      if (isMounted) {
        if (!error && data) {
          setProfile({
            id: data.id,
            username: data.username,
            name: data.name,
            image_url: data.image_url,
            banner_url: data.banner_url,
          });
        } else {
          setNotFound(true);
        }
        setLoading(false);
      }
    };
    fetchProfile();
    return () => { isMounted = false; };
  }, [routeUserId, routeUsername]);


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
        <Text style={{ color: 'white' }}>Profile not found.</Text>
        <View style={styles.backButton}>
          <Button title="Back" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>

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
          {profile.name && <Text style={styles.name}>{profile.name}</Text>}
          <Text style={styles.username}>@{profile.username}</Text>
        </View>
        {user && user.id !== profile.id && (
          <View style={{ marginLeft: 10 }}>
            <FollowButton targetUserId={profile.id} onToggle={refresh} />
          </View>
        )}
      </View>
      <View style={styles.statsRow}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('FollowList', { userId: profile.id, mode: 'followers' })
          }
        >
          <Text style={styles.statsText}>{followers ?? 0} Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('FollowList', { userId: profile.id, mode: 'following' })
          }
        >
          <Text style={styles.statsText}>{following ?? 0} Following</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ProfileTabsNavigator
        userId={profile.id}
        avatarUrl={profile.image_url}
        bannerUrl={profile.banner_url}
      />
    </View>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    padding: 20,

  },
  backButton: { alignSelf: 'flex-start', marginBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  banner: { width: '100%', height: 200, marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  placeholder: { backgroundColor: '#ffffff20' },
  textContainer: { marginLeft: 15 },
  username: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  name: { color: 'white', fontSize: 20, marginTop: 4 },
  center: { justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', marginLeft: 15, marginBottom: 20 },
  statsText: { color: 'white', marginRight: 15 },
});

