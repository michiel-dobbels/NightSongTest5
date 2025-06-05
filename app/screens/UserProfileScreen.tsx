import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Button, Dimensions, FlatList, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';
import { useAuth } from '../../AuthContext';
import FollowButton from '../components/FollowButton';
import PostCard, { Post } from '../components/PostCard';


interface Profile {
  id: string;
  username: string;
  name: string | null;
  image_url: string | null;
  banner_url: string | null;
}

export default function UserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    userId,
    avatarUrl,
    bannerUrl,

    name: initialName,
    username: initialUsername,
  } = route.params as {
    userId: string;
    avatarUrl?: string | null;
    bannerUrl?: string | null;

    name?: string | null;
    username?: string | null;
  };
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { user } = useAuth() as any;

  const [posts, setPosts] = useState<Post[]>([]);
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});

  const name = profile?.name ?? initialName ?? null;
  const username = profile?.username ?? initialUsername ?? null;

  const fetchPosts = useCallback(async () => {
    const targetId = profile?.id ?? userId;
    const { data } = await supabase
      .from('posts')
      .select(
        'id, content, image_url, user_id, created_at, reply_count, like_count, profiles(username, name, image_url, banner_url)'
      )
      .eq('user_id', targetId)
      .order('created_at', { ascending: false });
    if (data) {
      setPosts(data as Post[]);
      const replyMap = Object.fromEntries(
        (data as any[]).map(p => [p.id, p.reply_count ?? 0])
      );
      setReplyCounts(replyMap);
      const likeMap = Object.fromEntries(
        (data as any[]).map(p => [p.id, p.like_count ?? 0])
      );
      setLikeCounts(likeMap);
      if (user) {
        const { data: likedData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id)
          .is('reply_id', null);
        if (likedData) {
          const likedObj: { [key: string]: boolean } = {};
          likedData.forEach(l => {
            if (l.post_id) likedObj[l.post_id] = true;
          });
          setLikedPosts(likedObj);
        }
      }
    }
  }, [profile, userId, user]);

  const toggleLike = async (id: string) => {
    if (!user) return;
    const liked = likedPosts[id];
    setLikedPosts(prev => ({ ...prev, [id]: !liked }));
    setLikeCounts(prev => ({ ...prev, [id]: (prev[id] || 0) + (liked ? -1 : 1) }));
    if (liked) {
      await supabase.from('likes').delete().match({ user_id: user.id, post_id: id });
    } else {
      await supabase.from('likes').insert({ user_id: user.id, post_id: id });
    }
    const { data } = await supabase
      .from('posts')
      .select('like_count')
      .eq('id', id)
      .single();
    if (data) {
      setLikeCounts(prev => ({ ...prev, [id]: data.like_count ?? 0 }));
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );


  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setNotFound(false);
      let { data, error } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_url, banner_url')
        .eq('id', userId)
        .single();

      if (error?.code === '42703') {
        const retry = await supabase
          .from('profiles')
          .select('id, username, display_name, image_url, banner_url')

          .eq('id', userId)
          .single();
        data = retry.data as any;
        error = retry.error;
      }

      if (data) {
        setProfile({
          id: data.id,
          username: data.username,
          name:
            (data as any).name ??
            (data as any).display_name ??
            (data as any).full_name ??
            null,
          image_url:
            (data as any).avatar_url ??
            (data as any).image_url ??
            null,

          banner_url: data.banner_url,
        });
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [userId]);


  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        {profile?.banner_url || bannerUrl ? (
          <Image
            source={{ uri: profile?.banner_url || bannerUrl! }}
            style={styles.banner}
          />
        ) : (
          <View style={[styles.banner, styles.placeholder]} />
        )}

        {profile?.image_url || avatarUrl ? (
          <Image
            source={{ uri: profile?.image_url || avatarUrl! }}
            style={styles.avatar}
          />

        ) : (
          <View style={[styles.avatar, styles.placeholder]} />
        )}
        {name && <Text style={styles.name}>{name}</Text>}
        {username && <Text style={styles.username}>@{username}</Text>}
        {user && user.id !== userId && (
          <View style={{ marginTop: 10 }}>
            <FollowButton targetUserId={userId} />
          </View>
        )}
        <ActivityIndicator color="white" style={{ marginTop: 10 }} />
      </View>
    );
  }

  if (notFound || !profile) {
    return (
      <View style={[styles.container, styles.center]}>
        {profile?.banner_url || bannerUrl ? (
          <Image
            source={{ uri: profile?.banner_url || bannerUrl! }}
            style={styles.banner}
          />
        ) : (
          <View style={[styles.banner, styles.placeholder]} />
        )}

        {profile?.image_url || avatarUrl ? (
          <Image
            source={{ uri: profile?.image_url || avatarUrl! }}
            style={styles.avatar}
          />

        ) : (
          <View style={[styles.avatar, styles.placeholder]} />
        )}
        {name && <Text style={styles.name}>{name}</Text>}
        {username && <Text style={styles.username}>@{username}</Text>}
        {user && user.id !== userId && (
          <View style={{ marginTop: 10 }}>
            <FollowButton targetUserId={userId} />
          </View>
        )}
        
        <Text style={{ color: 'white', marginTop: 10 }}>Profile not found.</Text>
        <View style={styles.backButton}>
          <Button title="Back" onPress={() => navigation.goBack()} />
        </View>

      </View>
    );
  }

  return (
    <View style={styles.container}>
      {profile.banner_url || bannerUrl ? (
        <Image
          source={{ uri: profile.banner_url || bannerUrl! }}
          style={styles.banner}
        />

      ) : (
        <View style={[styles.banner, styles.placeholder]} />
      )}
      <View style={styles.backButton}>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.profileRow}>
        {profile.image_url || avatarUrl ? (
          <Image
            source={{ uri: profile.image_url || avatarUrl! }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.placeholder]} />
        )}
        <View style={styles.textContainer}>
          {name && <Text style={styles.name}>{name}</Text>}
          {username && <Text style={styles.username}>@{username}</Text>}
        </View>
        {user && user.id !== userId && (
          <View style={{ marginLeft: 10 }}>
            <FollowButton targetUserId={userId} />
          </View>
        )}
      </View>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            replyCount={replyCounts[item.id] || 0}
            likeCount={likeCounts[item.id] || 0}
            liked={likedPosts[item.id]}
            isMe={user?.id === item.user_id}
            avatarUri={item.profiles?.image_url || avatarUrl}
            onPress={() => navigation.navigate('PostDetail', { post: item })}
            onAvatarPress={() =>
              navigation.navigate('UserProfile', {
                userId: item.user_id,
                avatarUrl: item.profiles?.image_url || avatarUrl,
                bannerUrl: item.profiles?.banner_url,
                name: item.profiles?.name || item.profiles?.username || item.username,
                username: item.profiles?.username || item.username,
              })
            }
            onToggleLike={() => toggleLike(item.id)}
            onReplyPress={() => navigation.navigate('PostDetail', { post: item })}
          />
        )}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  banner: {
    width: '100%',
    height: Dimensions.get('window').height * 0.25,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  placeholder: { backgroundColor: '#ffffff20' },
  textContainer: { marginLeft: 15 },
  username: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  name: { color: 'white', fontSize: 20, marginTop: 4 },
  center: { justifyContent: 'center', alignItems: 'center' },
  

});
