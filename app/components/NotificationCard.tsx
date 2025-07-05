import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { DBNotification } from '../../lib/supabase/notifications';
import { colors } from '../styles/colors';

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  notification: DBNotification;
  onPress: () => void;
}

export default function NotificationCard({ notification, onPress }: Props) {
  const avatar = notification.sender?.image_url ?? null;
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.message}>{notification.message}</Text>
        <Text style={styles.time}>{timeAgo(notification.created_at)}</Text>
      </View>
      {!notification.read && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>New</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  placeholder: {
    backgroundColor: '#555',
  },
  message: {
    color: colors.text,
  },
  time: {
    color: colors.muted,
    fontSize: 12,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
  },
});
