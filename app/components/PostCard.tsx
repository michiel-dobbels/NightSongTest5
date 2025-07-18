import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from 'react-native';
import { useStories } from '../contexts/StoryStoreContext';
import { storyRing } from '../styles/storyRing';
import { Video } from 'expo-av';
import useLike from '../hooks/useLike';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../../AuthContext';
import { insertNotification } from '../../lib/supabase/notifications'; 

export interface Post {
  id: string;
  content: string;
  image_url?: string;
  video_url?: string;
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
  /**
   * Optional avatar override. If omitted the component will
   * fall back to the profile image on the post itself.
   */
  avatarUri?: string;
  bannerUrl?: string;
  /** Optional override for the post image URL */
  imageUrl?: string;
  /** Optional override for the post video URL */
  videoUrl?: string;
  replyCount: number;
  onPress: () => void;
  onAvatarPress?: () => void;
  onProfilePress: () => void;
  onDelete: () => void;
  onOpenReplies: () => void;
  showThreadLine?: boolean;
  /**
   * If true, the thread line should end behind this avatar
   * rather than extending to the bottom of the card.
   */
  isLastInThread?: boolean;
}

function PostCard({
  post,
  isOwner,
  avatarUri,
  bannerUrl,
  imageUrl,
  videoUrl,
  replyCount,
  onPress,
  onAvatarPress,
  onProfilePress,
  onDelete,
  onOpenReplies,
  showThreadLine = false,
  isLastInThread = false,
}: PostCardProps) {
  const displayName = post.profiles?.name || post.profiles?.username || post.username;
  const userName = post.profiles?.username || post.username;
  const isReply = (post as any).post_id !== undefined;
  const { likeCount, liked, toggleLike } = useLike(post.id, isReply);
  const { getStoriesForUser } = useStories();
  const hasStory = getStoriesForUser(post.user_id).length > 0;
  const { addNotification } = useNotifications();
  const { profile } = useAuth()!;

  const finalAvatarUri =
    avatarUri ?? post.profiles?.image_url ?? undefined;
  const finalImageUrl = imageUrl ?? post.image_url;
  const finalVideoUrl = videoUrl ?? post.video_url;

  const flameScale = React.useRef(new Animated.Value(0)).current;
  const flameOpacity = React.useRef(new Animated.Value(0)).current;

  const animateFlame = React.useCallback(() => {
    flameScale.setValue(0.5);
    flameOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(flameScale, {
        toValue: 2,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(flameOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
    ]).start();
  }, [flameScale, flameOpacity]);

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.post}>
        {showThreadLine && (
          <View
            style={[styles.threadLine, isLastInThread && styles.threadLineEnd]}
            pointerEvents="none"
          />
        )}
        {isOwner && (
          <TouchableOpacity
            onPress={e => {
              e.stopPropagation();
              onDelete();
            }}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>X</Text>
          </TouchableOpacity>
        )}
        <View style={styles.row}>
          <TouchableOpacity
            onPress={e => {
              e.stopPropagation();
              if (onAvatarPress) onAvatarPress();
              else onProfilePress();
            }}
          >
            {finalAvatarUri ? (
              <Image
                source={{ uri: finalAvatarUri }}
                style={[styles.avatar, hasStory && storyRing]}
              />
            ) : (
              <View style={[styles.avatar, styles.placeholder, hasStory && storyRing]} />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={e => {
                  e.stopPropagation();
                  onProfilePress();
                }}
              >
                <Text style={styles.username}>
                  {displayName} @{userName}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.timestamp, styles.timestampMargin]}>
                {timeAgo(post.created_at)}
              </Text>
            </View>
            <Text style={styles.postContent}>{post.content}</Text>
            {finalImageUrl && (
              <Image source={{ uri: finalImageUrl }} style={styles.postImage} />
            )}
            {finalVideoUrl ? (

              <TouchableWithoutFeedback onPressIn={e => e.stopPropagation()}>
                <View>
                  <Video
                    source={{ uri: finalVideoUrl }}
                    style={styles.postVideo}
                    useNativeControls
                    isMuted
                    resizeMode="contain"
                    onTouchStart={e => e.stopPropagation()}
                  />
                </View>
              </TouchableWithoutFeedback>
            ) : null}

          </View>
        </View>
        <TouchableOpacity
          style={styles.replyCountContainer}
          onPress={e => {
            e.stopPropagation();
            onOpenReplies();
          }}
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.accent} style={{ marginRight: 2 }} />
          <Text style={styles.replyCountLarge}>{replyCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.likeContainer}
          onPress={async e => {
            e.stopPropagation();

            if (!liked && profile && post.user_id !== profile.id) {
              const username = profile.username || 'Someone';
              console.log('👉 Liking detected. Inserting notification...');
              await insertNotification({
                sender_id: profile.id,
                recipient_id: post.user_id,
                type: 'like',
                entity_id: post.id,
                message: `${username} liked your post`,
              });

              console.log('👉 Done insertNotification.');
            }
            toggleLike();
            animateFlame();
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              opacity: flameOpacity,
              transform: [{ scale: flameScale }],
            }}
          >
            <Ionicons name="flame" size={24} color="red" />

          </Animated.View>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={18}
            color="red"
            style={{ marginRight: 2 }}
          />
          <Text style={[styles.likeCountLarge, liked && styles.likedLikeCount]}>
            {likeCount}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(PostCard);

const styles = StyleSheet.create({
  post: {
    backgroundColor: colors.background,
    borderRadius: 0,
    padding: 10,
    paddingBottom: 30,
    marginBottom: 0,
    borderBottomColor: '#444',
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 8,
    zIndex: 1,
  },
  placeholder: { backgroundColor: '#555' },
  deleteButton: {
    position: 'absolute',
    right: 6,
    top: 6,
    padding: 5,
  },
  deleteText: { color: colors.text, fontSize: 18 },
  postContent: { color: colors.text },
  username: { fontWeight: 'bold', color: colors.text },
  timestamp: { fontSize: 10, color: colors.muted },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  timestampMargin: { marginLeft: 6 },
  replyCountContainer: {
    position: 'absolute',
    bottom: 6,
    left: 66,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyCountLarge: { fontSize: 15, color: colors.muted },
  likeCountLarge: { fontSize: 15, color: colors.muted },
  likedLikeCount: { color: 'red' },
  likeContainer: {
    position: 'absolute',
    bottom: 6,
    left: '50%',
    transform: [{ translateX: -6 }],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginTop: 8,
  },
  postVideo: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginTop: 8,
  },
  threadLine: {
    position: 'absolute',
    left: 34,
    top: 0,
    bottom: -10,
    width: 2,
    backgroundColor: colors.accent,
    zIndex: 0,
  },
  threadLineEnd: {
    position: 'absolute',
    left: 34,

    top: 0,
    height: 48,
    width: 2,
    backgroundColor: colors.accent,
    zIndex: 0,

  },
});

