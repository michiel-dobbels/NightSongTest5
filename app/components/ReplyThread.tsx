import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import PostCard, { Post } from './PostCard';
import ReplyCard, { Reply } from './ReplyCard';
import { supabase } from '../../lib/supabase';
import { usePostStore } from '../contexts/PostStoreContext';

interface ReplyThreadProps {
  reply: Reply;
  isOwner: boolean;
  avatarUri?: string;
  bannerUrl?: string;
  onPress: (reply: Reply) => void;
  onProfilePress: (userId: string) => void;
  onDelete: () => void;
}

export default function ReplyThread({
  reply,
  isOwner,
  avatarUri,
  bannerUrl,
  onPress,
  onProfilePress,
  onDelete,
}: ReplyThreadProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [parent, setParent] = useState<Reply | null>(null);
  const { initialize } = usePostStore();

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const { data: postData } = await supabase
        .from('posts')
        .select(
          'id, content, image_url, video_url, user_id, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)'
        )
        .eq('id', reply.post_id)
        .single();
      if (!ignore && postData) {
        setPost(postData as Post);
        initialize([{ id: postData.id, like_count: postData.like_count }]);
      }
      if (reply.parent_id) {
        const { data: parentData } = await supabase
          .from('replies')
          .select(
            'id, post_id, parent_id, user_id, content, image_url, video_url, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)'
          )
          .eq('id', reply.parent_id)
          .single();
        if (!ignore && parentData) {
          setParent(parentData as Reply);
          initialize([{ id: parentData.id, like_count: parentData.like_count }]);
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [reply.post_id, reply.parent_id, initialize]);

  const navigateToProfile = (id: string) => onProfilePress(id);

  return (
    <View>
      {post && (
        <View style={[styles.post, styles.longReply]}>
          <View style={styles.threadLine} pointerEvents="none" />
          <PostCard
            post={post}
            isOwner={false}
            avatarUri={post.profiles?.image_url ?? undefined}
            bannerUrl={post.profiles?.banner_url ?? undefined}
            replyCount={post.reply_count ?? 0}
            onPress={() => onPress(reply)}
            onProfilePress={() => navigateToProfile(post.user_id)}
            onDelete={() => {}}
            onOpenReplies={() => {}}
          />
        </View>
      )}
      {parent && (
        <View style={[styles.post, styles.longReply]}>
          <View style={styles.threadLine} pointerEvents="none" />
          <ReplyCard
            reply={parent}
            isOwner={false}
            avatarUri={parent.profiles?.image_url ?? undefined}
            bannerUrl={parent.profiles?.banner_url ?? undefined}
            replyCount={parent.reply_count ?? 0}
            onPress={() => onPress(reply)}
            onProfilePress={() => navigateToProfile(parent.user_id)}
            onDelete={() => {}}
            onOpenReplies={() => {}}
          />
        </View>
      )}
      <View style={[styles.post, styles.longReply]}>
        <ReplyCard
          reply={reply}
          isOwner={isOwner}
          avatarUri={avatarUri}
          bannerUrl={bannerUrl}
          replyCount={reply.reply_count ?? 0}
          onPress={() => onPress(reply)}
          onProfilePress={() => navigateToProfile(reply.user_id)}
          onDelete={onDelete}
          onOpenReplies={() => {}}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  post: {
    backgroundColor: '#ffffff10',
    borderRadius: 0,
    padding: 10,
    marginBottom: 0,
    borderBottomColor: 'gray',
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  longReply: {
    paddingBottom: 30,
  },
  threadLine: {
    position: 'absolute',
    left: 26,
    top: 0,
    bottom: -10,
    width: 2,
    backgroundColor: '#66538f',
    zIndex: -1,
  },
});
