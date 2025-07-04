import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { colors } from '../app/styles/colors';

export default function NotificationsScreen() {
  const { user } = useAuth() || {};
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const load = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(
          'id, post_id, created_at, sender:profiles!sender_id(id, username, name, image_url)'
        )
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && isMounted) {
        setNotifications(data || []);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      {item.sender?.image_url ? (
        <Image source={{ uri: item.sender.image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]} />
      )}
      <Text style={styles.text}>
        {(item.sender?.name || item.sender?.username) + ' liked your post'}
      </Text>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sign in to see notifications</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8 },
  placeholder: { backgroundColor: '#555' },
  text: { color: colors.text },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.text },
});
