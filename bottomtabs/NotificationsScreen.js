import React, { useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useNotifications } from '../app/contexts/NotificationContext';

export default function NotificationsScreen() {
  const { notifications, refresh } = useNotifications();
  const focused = useIsFocused();

  useEffect(() => {
    if (focused) refresh();
  }, [focused, refresh]);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {notifications.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 8 }}>
              <Text>{item.message}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
