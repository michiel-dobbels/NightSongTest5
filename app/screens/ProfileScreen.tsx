import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../AuthContext';
import { useFollowCounts } from '../hooks/useFollowCounts';
import { colors } from '../styles/colors';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const {
    profile,
    profileImageUri,
    setProfileImageUri,
    bannerImageUri,
    setBannerImageUri,
  } = useAuth() as any;

  const { followers, following } = useFollowCounts(profile?.id ?? null);

  type Post = {
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
  };

  const [latestPost, setLatestPost] = useState<Post | null>(null);
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});

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

  const refreshLikeCount = async (id: string) => {
    const { data } = await supabase
      .from('posts')
      .select('like_count')
      .eq('id', id)
      .single();
    if (data) {
      setLikeCounts(prev => ({ ...prev, [id]: data.like_count ?? 0 }));
    }
  };

  const toggleLike = async (id: string) => {
    if (!profile) return;
    const liked = likedPosts[id];
    setLikedPosts(prev => ({ ...prev, [id]: !liked }));
    setLikeCounts(prev => ({ ...prev, [id]: (prev[id] || 0) + (liked ? -1 : 1) }));
    if (liked) {
      await supabase.from('likes').delete().match({ user_id: profile.id, post_id: id });
    } else {
      await supabase.from('likes').insert({ user_id: profile.id, post_id: id });
    }
    await refreshLikeCount(id);
  };

  useEffect(() => {
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id, content, image_url, user_id, created_at, reply_count, like_count, profiles(username, name, image_url, banner_url)',
        )
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const p = data[0] as Post;
        setLatestPost(p);
        setReplyCounts({ [p.id]: p.reply_count ?? 0 });
        setLikeCounts({ [p.id]: p.like_count ?? 0 });
        if (profile) {
          const { data: likedData } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', profile.id)
            .eq('post_id', p.id);
          if (likedData && likedData.length > 0) {
            setLikedPosts({ [p.id]: true });
          }
        }
      }
    };
    fetchLatest();
  }, [profile?.id]);


  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access photos is required!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      setProfileImageUri(`data:image/jpeg;base64,${base64}`);


    }
  };

  const pickBanner = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access photos is required!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      setBannerImageUri(`data:image/jpeg;base64,${base64}`);
    }
  };

  if (!profile) return null;

  return (
    <View style={styles.container}>
      {bannerImageUri ? (
        <Image source={{ uri: bannerImageUri }} style={styles.banner} />
      ) : (
        <View style={[styles.banner, styles.placeholder]} />
      )}
      <View style={styles.backButton}>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.profileRow}>
        {profileImageUri ? (
          <Image source={{ uri: profileImageUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]} />
        )}
        <View style={styles.textContainer}>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.name && (
            <Text style={styles.name}>{profile.name}</Text>
          )}
        </View>
      </View>
      <View style={styles.statsRow}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('FollowList', {
              userId: profile.id,
              mode: 'followers',
            })
          }
        >
          <Text style={styles.statsText}>{followers ?? 0} Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('FollowList', {
              userId: profile.id,
              mode: 'following',
            })
          }
        >
          <Text style={styles.statsText}>{following ?? 0} Following</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={pickImage} style={styles.uploadLink}>
        <Text style={styles.uploadText}>Upload Profile Picture</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={pickBanner} style={styles.uploadLink}>
        <Text style={styles.uploadText}>Upload Banner</Text>
      </TouchableOpacity>

      {latestPost && (
        <TouchableOpacity
          onPress={() => navigation.navigate('PostDetail', { post: latestPost })}
        >
          <View style={styles.postContainer}>
            <View style={styles.postRow}>
              <TouchableOpacity
                onPress={() =>
                  latestPost.user_id === profile.id
                    ? navigation.navigate('Profile')
                    : navigation.navigate('UserProfile', {
                        userId: latestPost.user_id,
                        avatarUrl:
                          latestPost.user_id === profile.id
                            ? profileImageUri
                            : latestPost.profiles?.image_url || undefined,
                        bannerUrl:
                          latestPost.user_id === profile.id
                            ? undefined
                            : latestPost.profiles?.banner_url || undefined,
                        name:
                          latestPost.profiles?.name ||
                          latestPost.profiles?.username ||
                          latestPost.username,
                        username:
                          latestPost.profiles?.username || latestPost.username,
                      })
                }
              >
                {latestPost.user_id === profile.id ? (
                  profileImageUri ? (
                    <Image
                      source={{ uri: profileImageUri }}
                      style={styles.postAvatar}
                    />
                  ) : (
                    <View style={[styles.postAvatar, styles.postPlaceholder]} />
                  )
                ) : latestPost.profiles?.image_url ? (
                  <Image
                    source={{ uri: latestPost.profiles.image_url }}
                    style={styles.postAvatar}
                  />
                ) : (
                  <View style={[styles.postAvatar, styles.postPlaceholder]} />
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={styles.postHeaderRow}>
                  <Text style={styles.postUsername}>
                    {latestPost.profiles?.name ||
                      latestPost.profiles?.username ||
                      latestPost.username}{' '}
                    @{
                      latestPost.profiles?.username || latestPost.username || ''
                    }
                  </Text>
                  <Text style={[styles.postTimestamp, styles.timestampMargin]}>
                    {timeAgo(latestPost.created_at)}
                  </Text>
                </View>
                <Text style={styles.postContent}>{latestPost.content}</Text>
                {latestPost.image_url && (
                  <Image
                    source={{ uri: latestPost.image_url }}
                    style={styles.postImage}
                  />
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.replyCountContainer}
              onPress={() => navigation.navigate('PostDetail', { post: latestPost })}
            >
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color="#66538f"
                style={{ marginRight: 2 }}
              />
              <Text style={styles.replyCountLarge}>
                {replyCounts[latestPost.id] || 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.likeContainer}
              onPress={() => toggleLike(latestPost.id)}
            >
              <Ionicons
                name={likedPosts[latestPost.id] ? 'heart' : 'heart-outline'}
                size={18}
                color="red"
                style={{ marginRight: 2 }}
              />
              <Text
                style={[
                  styles.likeCountLarge,
                  likedPosts[latestPost.id] && styles.likedLikeCount,
                ]}
              >
                {likeCounts[latestPost.id] || 0}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
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
  placeholder: {
    backgroundColor: '#ffffff20',
  },
  textContainer: {
    marginLeft: 15,
  },
  username: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  name: {
    color: 'white',
    fontSize: 20,
    marginTop: 4,
  },
  uploadLink: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#ffffff10',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  uploadText: { color: 'white' },
  statsRow: { flexDirection: 'row', marginLeft: 15, marginBottom: 20 },
  statsText: { color: 'white', marginRight: 15 },

  postContainer: {
    backgroundColor: '#ffffff10',
    borderRadius: 0,
    padding: 10,
    paddingBottom: 30,
    marginTop: 20,
    borderBottomColor: 'gray',
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  postRow: { flexDirection: 'row', alignItems: 'flex-start' },
  postAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 8 },
  postPlaceholder: { backgroundColor: '#555' },
  postHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  postUsername: { fontWeight: 'bold', color: 'white' },
  postTimestamp: { fontSize: 10, color: 'gray' },
  timestampMargin: { marginLeft: 6 },
  postContent: { color: 'white' },
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
