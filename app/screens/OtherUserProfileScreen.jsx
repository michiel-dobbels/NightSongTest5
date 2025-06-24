import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, FlatList, Button, TouchableOpacity } from 'react-native';
import { useStories } from '../contexts/StoryStoreContext';
import { storyRing } from '../styles/storyRing';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../styles/colors';
import FollowButton from '../components/FollowButton';
import PostCard from '../components/PostCard';
import { useAuth } from '../../AuthContext';
import { useFollowCounts } from '../hooks/useFollowCounts';
import { usePostStore } from '../contexts/PostStoreContext';
import { likeEvents } from '../likeEvents';
import { postEvents } from '../postEvents';
import { getLikeCounts } from '../../lib/getLikeCounts';

export default function OtherUserProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();

  const { getStoriesForUser } = useStories();

  const { initialize } = usePostStore();
  const { userId: routeUserId, username: routeUsername } = route.params || {};

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const idToLoad = profile?.id || routeUserId || null;
  const { followers, following, refresh } = useFollowCounts(idToLoad);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      setNotFound(false);
      let query = supabase.from('profiles').select('id, username, name, image_url, banner_url').single();
      if (routeUserId) query = query.eq('id', routeUserId);
      else if (routeUsername) query = query.eq('username', routeUsername);
      const { data, error } = await query;
      if (isMounted) {
        if (!error && data) {
          setProfile({
            id: data.id,
            username: data.username,
            name: data.name,
            image_url: data.image_url,
            banner_url: data.banner_url,
          });
        } else {
          setNotFound(true);
        }
        setLoading(false);
      }
    };
    fetchProfile();
    return () => { isMounted = false; };
  }, [routeUserId, routeUsername]);

  useEffect(() => {
    if (!idToLoad) return;
    const loadPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, content, image_url, video_url, user_id, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)')
        .eq('user_id', idToLoad)
        .order('created_at', { ascending: false });
      if (!error && data) {
        const seen = new Set();
        const unique = data.filter(p => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        setPosts(unique);
        const counts = await getLikeCounts(unique.map(p => p.id));
        initialize(unique.map(p => ({ id: p.id, like_count: counts[p.id] })));
      } else if (error) {
        console.error('Failed to fetch posts', error);
      }
    };
    loadPosts();
  }, [idToLoad, initialize]);

  useEffect(() => {
    const onLikeChanged = ({ id, count }) => {
      setPosts(prev => prev.map(p => (p.id === id ? { ...p, like_count: count } : p)));
    };
    likeEvents.on('likeChanged', onLikeChanged);
    const onPostDeleted = postId => {
      setPosts(prev => prev.filter(p => p.id !== postId));
    };
    postEvents.on('postDeleted', onPostDeleted);
    return () => {
      likeEvents.off('likeChanged', onLikeChanged);
      postEvents.off('postDeleted', onPostDeleted);
    };
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="white" />
      </View>
    );
  }

  if (notFound || !profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: colors.text }}>Profile not found.</Text>
        <View style={styles.backButton}>
          <Button title="Back" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>

      {profile.banner_url ? (
        <Image
          source={{ uri: profile.banner_url }}
          style={styles.banner}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.banner, styles.placeholder]} />
      )}
      <View style={styles.backButton}>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.profileRow}>
        {profile.image_url ? (
          <Image
            source={{ uri: profile.image_url }}
            style={[styles.avatar, getStoriesForUser(profile.id).length > 0 && storyRing]}
          />
        ) : (
          <View style={[styles.avatar, styles.placeholder, getStoriesForUser(profile.id).length > 0 && storyRing]} />
        )}
        <View style={styles.textContainer}>
          {profile.name && <Text style={styles.name}>{profile.name}</Text>}
          <Text style={styles.username}>@{profile.username}</Text>
        </View>
        {user && user.id !== profile.id && (
          <View style={{ marginLeft: 10 }}>
            <FollowButton targetUserId={profile.id} onToggle={refresh} />
          </View>
        )}
      </View>
      <View style={styles.statsRow}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('FollowList', { userId: profile.id, mode: 'followers' })
          }
        >
          <Text style={styles.statsText}>{followers ?? 0} Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('FollowList', { userId: profile.id, mode: 'following' })
          }
        >
          <Text style={styles.statsText}>{following ?? 0} Following</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      data={posts}
      ListHeaderComponent={renderHeader}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          isOwner={false}
          avatarUri={profile.image_url || undefined}
          bannerUrl={item.profiles?.banner_url || undefined}
          imageUrl={item.image_url || undefined}
          videoUrl={item.video_url || undefined}
          replyCount={item.reply_count ?? 0}
          onPress={() => navigation.navigate('PostDetail', { post: item })}
          onProfilePress={() => {}}
          onDelete={() => {}}
          onOpenReplies={() => navigation.navigate('PostDetail', { post: item })}
        />
      )}
    />
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 0,
  },
  headerContainer: {
    padding: 20,

  },
  backButton: { alignSelf: 'flex-start', marginBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  banner: { width: '100%', height: 200, marginBottom: 20, marginHorizontal: -20 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  placeholder: { backgroundColor: '#555' },
  textContainer: { marginLeft: 15 },
  username: { color: colors.text, fontSize: 24, fontWeight: 'bold' },
  name: { color: colors.text, fontSize: 20, marginTop: 4 },
  center: { justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', marginLeft: 15, marginBottom: 20 },
  statsText: { color: colors.text, marginRight: 15 },
});

