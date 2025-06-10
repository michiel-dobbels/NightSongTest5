import React, { useState, useCallback } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import PostCard, { Post } from './PostCard';
import { getUserReplies, ReplyThread } from '../../lib/getUserReplies';
import { supabase } from '../../lib/supabase';
import { getLikeCounts } from '../../lib/getLikeCounts';
import { usePostStore } from '../contexts/PostStoreContext';
import { colors } from '../styles/colors';

const Tab = createMaterialTopTabNavigator();

interface Props {
  userId: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}

function PostsTab({ userId, avatarUrl, bannerUrl }: Props) {
  const navigation = useNavigation<any>();
  const { initialize } = usePostStore();
  const [posts, setPosts] = useState<Post[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const load = async () => {
        const { data, error } = await supabase
          .from('posts')
          .select(
            'id, content, image_url, video_url, user_id, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)'
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data && isMounted) {
          const unique: Post[] = [];
          const seen = new Set<string>();
          for (const p of data as Post[]) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              unique.push(p);
            }
          }
          setPosts(unique);
          const counts = await getLikeCounts(unique.map(p => p.id));
          initialize(unique.map(p => ({ id: p.id, like_count: counts[p.id] })));
        } else if (error) {
          console.error('Failed to fetch posts', error);
        }
      };
      load();
      return () => {
        isMounted = false;
      };
    }, [userId, initialize])
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          isOwner={false}
          avatarUri={item.profiles?.image_url || avatarUrl || undefined}
          bannerUrl={item.profiles?.banner_url || bannerUrl || undefined}
          replyCount={item.reply_count ?? 0}
          onPress={() => navigation.navigate('PostDetail', { post: item })}
          onProfilePress={() =>
            navigation.navigate('OtherUserProfile', { userId: item.user_id })
          }
          onDelete={() => {}}
          onOpenReplies={() => navigation.navigate('PostDetail', { post: item })}
        />
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No posts yet</Text>}
    />
  );
}

function RepliesTab({ userId }: Props) {
  const navigation = useNavigation<any>();
  const [threads, setThreads] = useState<ReplyThread[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const data = await getUserReplies(userId);
          setThreads(data);
        } catch (e) {
          console.error('Failed to fetch replies', e);
        }
      };
      load();
    }, [userId])
  );

  const renderItem = ({ item }: { item: ReplyThread }) => (
    <View style={styles.threadContainer}>
      {item.post && (
        <PostCard
          post={item.post}
          isOwner={false}
          avatarUri={item.post.profiles?.image_url || undefined}
          bannerUrl={item.post.profiles?.banner_url || undefined}
          replyCount={item.post.reply_count ?? 0}
          onPress={() => navigation.navigate('PostDetail', { post: item.post })}
          onProfilePress={() =>
            navigation.navigate('OtherUserProfile', { userId: item.post!.user_id })
          }
          onDelete={() => {}}
          onOpenReplies={() => navigation.navigate('PostDetail', { post: item.post })}
        />
      )}
      {item.parent && (
        <View style={styles.threadChild}>
          <PostCard
            post={item.parent as any}
            isOwner={false}
            avatarUri={item.parent.profiles?.image_url || undefined}
            bannerUrl={item.parent.profiles?.banner_url || undefined}
            replyCount={item.parent.reply_count ?? 0}
            onPress={() =>
              navigation.navigate('ReplyDetail', {
                reply: item.parent,
                originalPost: item.post,
                ancestors: [],
              })
            }
            onProfilePress={() =>
              navigation.navigate('OtherUserProfile', { userId: item.parent!.user_id })
            }
            onDelete={() => {}}
            onOpenReplies={() =>
              navigation.navigate('ReplyDetail', { reply: item.parent, originalPost: item.post })
            }
          />
        </View>
      )}
      <View style={styles.threadChild}>
        <PostCard
          post={item.reply as any}
          isOwner={false}
          avatarUri={item.reply.profiles?.image_url || undefined}
          bannerUrl={item.reply.profiles?.banner_url || undefined}
          replyCount={item.reply.reply_count ?? 0}
          onPress={() =>
            navigation.navigate('ReplyDetail', {
              reply: item.reply,
              originalPost: item.post,
              ancestors: item.parent ? [item.parent] : [],
            })
          }
          onProfilePress={() =>
            navigation.navigate('OtherUserProfile', { userId: item.reply.user_id })
          }
          onDelete={() => {}}
          onOpenReplies={() =>
            navigation.navigate('ReplyDetail', {
              reply: item.reply,
              originalPost: item.post,
              ancestors: item.parent ? [item.parent] : [],
            })
          }
        />
      </View>
    </View>
  );

  return (
    <FlatList
      data={threads}
      keyExtractor={item => item.reply.id}
      renderItem={renderItem}
      ListEmptyComponent={<Text style={styles.emptyText}>No replies yet</Text>}
    />
  );
}

export default function ProfileTabsNavigator(props: Props) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: 'transparent' },
        tabBarLabelStyle: { color: 'white', fontWeight: 'bold' },
        tabBarIndicatorStyle: { backgroundColor: '#7814db' },
        tabBarScrollEnabled: true,
      }}
    >
      <Tab.Screen name="Posts">
        {() => <PostsTab {...props} />}
      </Tab.Screen>
      <Tab.Screen name="Replies">
        {() => <RepliesTab {...props} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  emptyText: { textAlign: 'center', color: colors.text, marginTop: 20 },
  threadContainer: { marginBottom: 16 },
  threadChild: {
    marginLeft: 20,
    borderLeftWidth: 1,
    borderLeftColor: '#555',
    paddingLeft: 10,
  },
});

