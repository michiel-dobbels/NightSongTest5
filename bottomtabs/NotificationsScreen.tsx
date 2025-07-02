import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../AuthContext';
import { getNotifications, markAsRead, Notification } from '../lib/notifications';
import { colors } from '../app/styles/colors';

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsScreen() {
  const { user } = useAuth()!;
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const list = await getNotifications(user.id);
      setItems(list);
      list.forEach(n => {
        if (!n.read) markAsRead(n.id);
      });
    };
    load();
  }, [user?.id]);

  const renderItem = ({ item }: { item: Notification }) => (
    <View style={styles.item}>
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 && { flex: 1, justifyContent: 'center', alignItems: 'center' }}
        ListEmptyComponent={<Text style={{ color: colors.text }}>No notifications</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#444',
  },
  message: { color: colors.text },
  time: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
