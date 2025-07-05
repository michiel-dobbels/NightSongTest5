import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NotificationCard from '../components/NotificationCard';
import { useNotifications } from '../../lib/hooks/useNotifications';
import { colors } from '../styles/colors';

export default function NotificationsScreen() {
  const { notifications, markAsRead, refresh } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const onPress = (n: any) => {
    markAsRead(n.id);
    // Navigate based on type if desired
    if (n.type === 'reply') {
      navigation.navigate('ReplyDetail', { replyId: n.entity_id });
    } else {
      navigation.navigate('PostDetail', { postId: n.entity_id });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <NotificationCard notification={item} onPress={() => onPress(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
