import React from 'react';

import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';
import PostCard, { Post } from '../components/PostCard';
import { supabase } from '../../lib/supabase';
import { FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const {
    profile,
    profileImageUri,
    setProfileImageUri,
    bannerImageUri,
    setBannerImageUri,
  } = useAuth() as any;

  const [posts, setPosts] = useState<Post[]>([]);
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});

  const fetchPosts = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('posts')
      .select(
        'id, content, image_url, user_id, created_at, reply_count, like_count, profiles(username, name, image_url, banner_url)'
      )
      .eq('user_id', profile.id)
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
      if (profile.id) {
        const { data: likedData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', profile.id)
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
  }, [profile]);

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
      <TouchableOpacity onPress={pickImage} style={styles.uploadLink}>
        <Text style={styles.uploadText}>Upload Profile Picture</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={pickBanner} style={styles.uploadLink}>
        <Text style={styles.uploadText}>Upload Banner</Text>
      </TouchableOpacity>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            replyCount={replyCounts[item.id] || 0}
            likeCount={likeCounts[item.id] || 0}
            liked={likedPosts[item.id]}
            isMe
            avatarUri={profileImageUri}
            onPress={() => navigation.navigate('PostDetail', { post: item })}
            onAvatarPress={() => navigation.navigate('Profile')}
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

});
