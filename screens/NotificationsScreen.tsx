import React, { useState } from 'react';
import { View, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NotificationCard from '../app/components/NotificationCard';
import { useNotifications } from '../app/contexts/NotificationContext';
import { colors } from '../app/styles/colors';

export default function NotificationsScreen() {
  const { notifications, refresh, markRead } = useNotifications();
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
});
