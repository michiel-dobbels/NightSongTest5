import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export type Post = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  username?: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
  } | null;
};

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

export default function PostItem({ post, onPress }: { post: Post; onPress?: () => void }) {
  const displayName =
    post.profiles?.display_name || post.profiles?.username || post.username;

  const content = (
    <View style={styles.post}>
      <Text style={styles.username}>@{displayName}</Text>
      <Text style={styles.content}>{post.content}</Text>
      <Text style={styles.timestamp}>{timeAgo(post.created_at)}</Text>
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }
  return content;
}

const styles = StyleSheet.create({
  post: {
    backgroundColor: '#ffffff10',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  username: { fontWeight: 'bold', color: 'white' },
  content: { color: 'white', marginTop: 4, marginBottom: 4 },
  timestamp: { fontSize: 10, color: 'gray' },
});
