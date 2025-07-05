import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  color: string;
  size: number;
  count: number;
}

export default function NotificationBellIcon({ color, size, count }: Props) {
  return (
    <View>
      <Ionicons name="notifications-outline" size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: 'red',
    borderRadius: 8,
    paddingHorizontal: 4,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});
