import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types/Post';
import { timeAgo } from '../utils/timeAgo';

interface PostCardProps {
  post: Post;
  isCurrentUser: boolean;
  avatarUri?: string | null;
  onPress?: () => void;
  onPressAvatar?: () => void;
  onLike?: () => void;
  onReply?: () => void;
  onDelete?: () => void;
  liked?: boolean;
  likeCount?: number;
  replyCount?: number;
  style?: ViewStyle;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  isCurrentUser,
  avatarUri,
  onPress,
  onPressAvatar,
  onLike,
  onReply,
  onDelete,
  liked = false,
  likeCount = 0,
  replyCount = 0,
  style,
}) => {
  const displayName = post.profiles?.name || post.profiles?.username || post.username;
  const userName = post.profiles?.username || post.username;

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={[styles.post, style]}>
        {isCurrentUser && onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Text style={{ color: 'white' }}>X</Text>
          </TouchableOpacity>
        )}
        <View style={styles.row}>
          <TouchableOpacity onPress={onPressAvatar}>
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
            {post.image_url && <Image source={{ uri: post.image_url }} style={styles.postImage} />}
          </View>
        </View>
        <TouchableOpacity style={styles.replyCountContainer} onPress={onReply}>
          <Ionicons name="chatbubble-outline" size={18} color="#66538f" style={{ marginRight: 2 }} />
          <Text style={styles.replyCountLarge}>{replyCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeContainer} onPress={onLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color="red" style={{ marginRight: 2 }} />
          <Text style={[styles.likeCountLarge, liked && styles.likedLikeCount]}>
            {likeCount}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

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

export default PostCard;
