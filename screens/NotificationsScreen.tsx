import React, { useState, useCallback } from 'react';

import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import NotificationCard from '../app/components/NotificationCard';
import { useNotifications } from '../lib/hooks/useNotifications';
import { colors } from '../app/styles/colors';
import { useAuth } from '../AuthContext';

export default function NotificationsScreen() {
  const { notifications, refresh, markRead, markAllRead } = useNotifications();

  const { profile, profileImageUri } = useAuth()!;
  const navigation = useNavigation<any>();
  const spacerHeight = Dimensions.get('window').height * 0.1;
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        markAllRead();
      };
    }, [markAllRead])
  );

  const handlePress = (n: any) => {
    markRead(n.id);
    if (n.type === 'reply') {
      navigation.navigate('ReplyDetail', { id: n.entity_id });
    } else if (n.type === 'post') {
      navigation.navigate('PostDetail', { id: n.entity_id });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={[styles.avatarContainer, { marginTop: spacerHeight }]}

            >
              {profileImageUri || profile?.image_url ? (
                <Image
                  source={{ uri: profileImageUri ?? (profile?.image_url as string) }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.placeholder]} />
              )}
            </TouchableOpacity>
          </View>
        }

        data={notifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <NotificationCard notification={item} onPress={() => handlePress(item)} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 10 },
  avatarContainer: {
    marginBottom: 10,
    alignSelf: 'center',
    alignItems: 'center',
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  placeholder: { backgroundColor: '#555' },
  header: {
    alignItems: 'center',
  },

});
