import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import useLike from '../hooks/useLike';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';

export interface Post {
  id: string;
  content: string;
  image_url?: string;
  user_id: string;
  created_at: string;
  username?: string;
  reply_count?: number;
  like_count?: number;
  profiles?: {
    username: string | null;
    name: string | null;
    image_url?: string | null;
    banner_url?: string | null;
  } | null;
}

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

export interface PostCardProps {
  post: Post;
  isOwner: boolean;
  avatarUri?: string;
  bannerUrl?: string;
  replyCount: number;
  onPress: () => void;
  onProfilePress: () => void;
  onDelete: () => void;
  onOpenReplies: () => void;
}

export default function PostCard({
  post,
  isOwner,
  avatarUri,
  replyCount,
  onPress,
  onProfilePress,
  onDelete,
  onOpenReplies,
}: PostCardProps) {
  const displayName = post.profiles?.name || post.profiles?.username || post.username;
  const userName = post.profiles?.username || post.username;
  const isReply = (post as any).post_id !== undefined;
  const { likeCount, liked, toggleLike } = useLike(post.id, isReply);

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.post}>
        {isOwner && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Text style={{ color: 'white' }}>X</Text>
          </TouchableOpacity>
        )}
        <View style={styles.row}>
          <TouchableOpacity onPress={onProfilePress}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholder]} />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={styles.headerRow}>
              <Text style={styles.username}>
                {displayName} @{userName}
              </Text>
              <Text style={[styles.timestamp, styles.timestampMargin]}>
                {timeAgo(post.created_at)}
              </Text>
            </View>
            <Text style={styles.postContent}>{post.content}</Text>
            {post.image_url && (
              <Image source={{ uri: post.image_url }} style={styles.postImage} />
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.replyCountContainer} onPress={onOpenReplies}>
          <Ionicons name="chatbubble-outline" size={18} color="#66538f" style={{ marginRight: 2 }} />
          <Text style={styles.replyCountLarge}>{replyCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeContainer} onPress={toggleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color="red" style={{ marginRight: 2 }} />
          <Text style={[styles.likeCountLarge, liked && styles.likedLikeCount]}>{likeCount}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  post: {
    backgroundColor: '#ffffff10',
    borderRadius: 0,
    padding: 10,
    paddingBottom: 30,
    marginBottom: 0,
    borderBottomColor: 'gray',
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 8 },
  placeholder: { backgroundColor: '#555' },
  deleteButton: {
    position: 'absolute',
    right: 6,
    top: 6,
    padding: 4,
  },
  postContent: { color: 'white' },
  username: { fontWeight: 'bold', color: 'white' },
  timestamp: { fontSize: 10, color: 'gray' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  timestampMargin: { marginLeft: 6 },
  replyCountContainer: {
    position: 'absolute',
    bottom: 6,
    left: 66,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyCountLarge: { fontSize: 15, color: 'gray' },
  likeCountLarge: { fontSize: 15, color: 'gray' },
  likedLikeCount: { color: 'red' },
  likeContainer: {
    position: 'absolute',
    bottom: 6,
    left: '50%',
    transform: [{ translateX: -6 }],
    flexDirection: 'row',
    alignItems: 'center',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginTop: 8,
  },
});

