import React, { useState } from 'react';
import { View, FlatList, RefreshControl, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NotificationCard from '../app/components/NotificationCard';
import { useNotifications } from '../lib/hooks/useNotifications';
import { colors } from '../app/styles/colors';
import { useAuth } from '../AuthContext';

export default function NotificationsScreen() {
  const { notifications, refresh, markRead } = useNotifications();
  const { profile, profileImageUri } = useAuth()!;
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

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
          <View style={styles.avatarContainer}>
            {profileImageUri || profile?.image_url ? (
              <Image
                source={{ uri: profileImageUri ?? (profile?.image_url as string) }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.placeholder]} />
            )}
          </View>
        }
        ListHeaderComponentStyle={styles.avatarContainer}
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
  avatarContainer: { marginBottom: 10, alignItems: 'flex-start' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  placeholder: { backgroundColor: '#555' },
});
