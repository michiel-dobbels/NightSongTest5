import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Button,
  Dimensions,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';
import { useFollowCounts } from '../hooks/useFollowCounts';
import { useAuth } from '../../AuthContext';
import FollowButton from '../components/FollowButton';
import PostCard, { Post } from '../components/PostCard';
import { usePostStore } from '../contexts/PostStoreContext';
import { likeEvents } from '../likeEvents';
import { getLikeCounts } from '../../lib/getLikeCounts';


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
  const [followingProfiles, setFollowingProfiles] =
    useState<{
      id: string;
      username: string | null;
      name: string | null;
      avatar_url: string | null;
    }[]>([]);

  const [posts, setPosts] = useState<Post[]>([]);
  const { initialize } = usePostStore();

  const { user } = useAuth() as any;

  const name = profile?.name ?? initialName ?? null;
  const username = profile?.username ?? initialUsername ?? null;
  const { followers, following, refresh } = useFollowCounts(userId);


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

  useFocusEffect(
    useCallback(() => {
      const loadPosts = async () => {
        const { data, error } = await supabase
          .from('posts')
          .select(
            'id, content, image_url, user_id, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)'
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setPosts(data as Post[]);
          const counts = await getLikeCounts(data.map(p => p.id));
          initialize(data.map(p => ({ id: p.id, like_count: counts[p.id] })));
        } else if (error) {
          console.error('Failed to fetch posts', error);
        }
      };
      loadPosts();
    }, [userId, initialize])
  );

  useEffect(() => {
    const onLikeChanged = ({ id, count }: { id: string; count: number }) => {
      setPosts(prev => prev.map(p => (p.id === id ? { ...p, like_count: count } : p)));
    };
    likeEvents.on('likeChanged', onLikeChanged);
    return () => {
      likeEvents.off('likeChanged', onLikeChanged);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchFollowing = async () => {
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followError) {
        console.error('Failed to fetch following list', followError);
        return;
      }

      const ids = (followData ?? []).map(f => f.following_id);
      if (ids.length === 0) {
        if (isMounted) setFollowingProfiles([]);
        return;
      }

      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, name, image_url')
        .in('id', ids);

      if (profileError?.code === '42703') {
        const retry = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', ids);
        profileData = retry.data;
        profileError = retry.error;
      }

      if (profileError) {
        console.error('Failed to fetch profiles', profileError);
        return;
      }

      if (isMounted && profileData) {
        const formatted = profileData.map(p => ({
          id: p.id,
          username: p.username,
          name:
            (p as any).name ??
            (p as any).display_name ??
            (p as any).full_name ??
            null,
          avatar_url: (p as any).image_url ?? (p as any).avatar_url,
        }));
        setFollowingProfiles(formatted);
      }
    };

    fetchFollowing();

    return () => {
      isMounted = false;
    };
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
            <FollowButton targetUserId={userId} onToggle={refresh} />
          </View>
        )}
        <View style={styles.statsRow}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('FollowList', {
                userId,
                mode: 'followers',
              })
            }
          >
            <Text style={styles.statsText}>{followers ?? 0} Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('FollowList', {
                userId,
                mode: 'following',
              })
            }
          >
            <Text style={styles.statsText}>{following ?? 0} Following</Text>
          </TouchableOpacity>

        </View>
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
            <FollowButton targetUserId={userId} onToggle={refresh} />
          </View>
        )}
        <View style={styles.statsRow}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('FollowList', {
                userId,
                mode: 'followers',
              })
            }
          >
            <Text style={styles.statsText}>{followers ?? 0} Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('FollowList', {
                userId,
                mode: 'following',
              })
            }
          >
            <Text style={styles.statsText}>{following ?? 0} Following</Text>
          </TouchableOpacity>

        </View>
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
            <FollowButton targetUserId={userId} onToggle={refresh} />
          </View>
        )}
      </View>
      <View style={styles.statsRow}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('FollowList', {
              userId,
              mode: 'followers',
            })
          }
        >
          <Text style={styles.statsText}>{followers ?? 0} Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('FollowList', {
              userId,
              mode: 'following',
            })
          }
        >
          <Text style={styles.statsText}>{following ?? 0} Following</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Posts</Text>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item as Post}
            isOwner={false}
            avatarUri={profile.image_url || avatarUrl || undefined}
            bannerUrl={item.profiles?.banner_url || bannerUrl || undefined}
            replyCount={item.reply_count ?? 0}
            onPress={() => navigation.navigate('PostDetail', { post: item })}
            onProfilePress={() => {}}
            onDelete={() => {}}
            onOpenReplies={() => navigation.navigate('PostDetail', { post: item })}
          />
        )}
      />

      <Text style={styles.sectionTitle}>Following</Text>
      <FlatList
        data={followingProfiles}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.followingRow}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.followingAvatar} />
            ) : (
              <View style={[styles.followingAvatar, styles.placeholder]} />
            )}
            <View>
              {item.name && <Text style={styles.followingName}>{item.name}</Text>}
              <Text style={styles.followingUsername}>{item.username}</Text>
            </View>
          </View>
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
  statsRow: { flexDirection: 'row', marginLeft: 15, marginBottom: 20 },
  statsText: { color: 'white', marginRight: 15 },
  sectionTitle: { color: 'white', fontSize: 18, marginBottom: 10 },
  followingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  followingAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  followingName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  followingUsername: { color: 'white', fontSize: 16 },

});
