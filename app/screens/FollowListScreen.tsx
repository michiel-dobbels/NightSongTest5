import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors } from '../styles/colors';
import FollowingList, { FollowingUser } from '../components/FollowingList';
import { getFollowingProfiles } from '../../lib/getFollowingProfiles';
import { getFollowersProfiles } from '../../lib/getFollowersProfiles';

export default function FollowListScreen() {
  const route = useRoute<any>();
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
      <FollowingList users={profiles} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
