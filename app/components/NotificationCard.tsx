import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Notification } from '../../lib/supabase/notifications';
import { colors } from '../styles/colors';

interface Props {
  notification: Notification;
  onPress: () => void;
}

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

export default function NotificationCard({ notification, onPress }: Props) {
  const avatar = notification.sender?.image_url || undefined;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]} />
      )}
      <View style={styles.info}>
        <Text style={styles.message}>{notification.message}</Text>
        <Text style={styles.time}>{timeAgo(notification.created_at)}</Text>
      </View>
      {!notification.read && (
        <View style={styles.newBadge}>
          <Text style={styles.newText}>New</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.muted,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  placeholder: { backgroundColor: colors.muted },
  info: { flex: 1 },
  message: { color: colors.text },
  time: { color: colors.muted, fontSize: 12, marginTop: 2 },
  newBadge: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  newText: { color: colors.text, fontSize: 10 },
});
