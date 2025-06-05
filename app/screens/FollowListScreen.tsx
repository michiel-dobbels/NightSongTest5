import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Button } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../styles/colors';
import FollowingList, { FollowingUser } from '../components/FollowingList';
import { getFollowingProfiles } from '../../lib/getFollowingProfiles';
import { getFollowersProfiles } from '../../lib/getFollowersProfiles';

export default function FollowListScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { userId, mode } = route.params as {
    userId: string;
    mode: 'followers' | 'following';
  };

  const [profiles, setProfiles] = useState<FollowingUser[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchProfiles = async () => {
      try {
        const data =
          mode === 'followers'
            ? await getFollowersProfiles(userId)
            : await getFollowingProfiles(userId);
        if (isMounted) setProfiles(data);
      } catch (e) {
        console.error('Failed to fetch follow list', e);
      }
    };
    fetchProfiles();
    return () => {
      isMounted = false;
    };
  }, [userId, mode]);

  return (
    <View style={styles.container}>
      <View style={styles.backButton}>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
      <FollowingList users={profiles} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
});
