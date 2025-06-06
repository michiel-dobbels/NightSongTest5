import React from 'react';
import { FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import PostCard from './PostCard';
import { Post } from '../types/Post';

interface PostListProps {
  posts: Post[];
}

export default function PostList({ posts }: PostListProps) {
  const navigation = useNavigation<any>();
  const { user, profile } = useAuth() as any;

  return (
    <FlatList
      data={posts}
      keyExtractor={item => item.id}
      renderItem={({ item }) => {
        const isMe = user?.id === item.user_id;
        const avatarUri = isMe ? profile?.image_url ?? null : item.profiles?.image_url || null;
        const displayName = item.profiles?.name || item.profiles?.username || item.username;
        const usernameDisplay = item.profiles?.username || item.username;
        return (
          <PostCard
            post={item}
            isCurrentUser={isMe}
            avatarUri={avatarUri}
            onPress={() => navigation.navigate('PostDetail', { post: item })}
            onPressAvatar={() => {
              if (isMe) {
                navigation.navigate('Profile');
              } else {
                navigation.navigate('UserProfile', {
                  userId: item.user_id,
                  avatarUrl: avatarUri,
                  bannerUrl: item.profiles?.banner_url,
                  name: displayName,
                  username: usernameDisplay,
                });
              }
            }}
            onDelete={() => {}}
            onReply={() => {}}
            onLike={() => {}}
            likeCount={item.like_count || 0}
            replyCount={item.reply_count || 0}
          />
        );
      }}
    />
  );
}
