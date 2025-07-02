import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../AuthContext';
import { getNotifications, Notification } from '../../lib/notifications';

import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';

export default function NotificationBell({ onPress }: { onPress: () => void }) {
  const { user } = useAuth()!;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const list = await getNotifications(user.id);
      setCount(list.filter(n => !n.read).length);
    };
    load();
    const subscription = supabase
      .from<Notification>(`notifications:recipient_id=eq.${user.id}`)
      .on('INSERT', () => setCount(c => c + 1))
      .on('UPDATE', payload => {
        if (payload.new.read && !payload.old.read) {
          setCount(c => Math.max(0, c - 1));
        }
      })
      .subscribe();
    return () => {
      supabase.removeSubscription(subscription);

    };
  }, [user?.id]);

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <Ionicons name="notifications-outline" size={24} color={colors.accent} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 4 },
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'red',
    borderRadius: 8,
    minWidth: 16,
    minHeight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: 'white', fontSize: 10, paddingHorizontal: 2 },
});
