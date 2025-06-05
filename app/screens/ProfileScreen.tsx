import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
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

  const Tab = createMaterialTopTabNavigator();

  const PostsTab = () => {
    const { user, profile, profileImageUri, bannerImageUri } = useAuth() as any;
    const navigation = useNavigation<any>();

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

    const [posts, setPosts] = useState<Post[]>([]);
    const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
    const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
    const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});
    const [replyModalVisible, setReplyModalVisible] = useState(false);
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replyImage, setReplyImage] = useState<string | null>(null);

    const timeAgo = (dateString: string) => {
      const diff = Date.now() - new Date(dateString).getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      if (minutes < 1) return 'just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    };

    const fetchPosts = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id, content, image_url, user_id, created_at, reply_count, like_count, profiles(username, name, image_url, banner_url)',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPosts(data as Post[]);
        const replyMap = Object.fromEntries(
          (data as any[]).map(p => [p.id, p.reply_count ?? 0]),
        );
        const likeMap = Object.fromEntries(
          (data as any[]).map(p => [p.id, p.like_count ?? 0]),
        );
        setReplyCounts(replyMap);
        setLikeCounts(likeMap);

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
    };

    useEffect(() => {
      fetchPosts();
    }, []);

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
      if (!user) return;
      const liked = likedPosts[id];
      setLikedPosts(prev => ({ ...prev, [id]: !liked }));
      setLikeCounts(prev => ({ ...prev, [id]: (prev[id] || 0) + (liked ? -1 : 1) }));
      if (liked) {
        await supabase.from('likes').delete().match({ user_id: user.id, post_id: id });
      } else {
        await supabase.from('likes').insert({ user_id: user.id, post_id: id });
      }
      await refreshLikeCount(id);
    };

    const openReplyModal = (postId: string) => {
      setActivePostId(postId);
      setReplyText('');
      setReplyImage(null);
      setReplyModalVisible(true);
    };

    const pickReplyImage = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });
        setReplyImage(`data:image/jpeg;base64,${base64}`);
      }
    };

    const handleReplySubmit = async () => {
      if (!activePostId || (!replyText.trim() && !replyImage) || !user) {
        setReplyModalVisible(false);
        return;
      }
      setReplyModalVisible(false);

      await supabase.from('replies').insert({
        post_id: activePostId,
        parent_id: null,
        user_id: user.id,
        content: replyText,
        image_url: replyImage,
        username: profile.name || profile.username,
      });

      setReplyCounts(prev => ({
        ...prev,
        [activePostId]: (prev[activePostId] || 0) + 1,
      }));
      setReplyText('');
      setReplyImage(null);
      fetchPosts();
    };

    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const displayName =
              item.profiles?.name || item.profiles?.username || item.username;
            const userName = item.profiles?.username || item.username;
            const avatarUri = profileImageUri;

            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('PostDetail', { post: item })}
              >
                <View style={postStyles.post}>
                  <View style={postStyles.row}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={postStyles.avatar} />
                    ) : (
                      <View style={[postStyles.avatar, postStyles.placeholder]} />
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={postStyles.headerRow}>
                        <Text style={postStyles.username}>
                          {displayName} @{userName}
                        </Text>
                        <Text style={[postStyles.timestamp, postStyles.timestampMargin]}>
                          {timeAgo(item.created_at)}
                        </Text>
                      </View>
                      <Text style={postStyles.postContent}>{item.content}</Text>
                      {item.image_url && (
                        <Image source={{ uri: item.image_url }} style={postStyles.postImage} />
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={postStyles.replyCountContainer}
                    onPress={() => openReplyModal(item.id)}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={18}
                      color="#66538f"
                      style={{ marginRight: 2 }}
                    />
                    <Text style={postStyles.replyCountLarge}>{replyCounts[item.id] || 0}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={postStyles.likeContainer}
                    onPress={() => toggleLike(item.id)}
                  >
                    <Ionicons
                      name={likedPosts[item.id] ? 'heart' : 'heart-outline'}
                      size={18}
                      color="red"
                      style={{ marginRight: 2 }}
                    />
                    <Text
                      style={[
                        postStyles.likeCountLarge,
                        likedPosts[item.id] && postStyles.likedLikeCount,
                      ]}
                    >
                      {likeCounts[item.id] || 0}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
        <Modal visible={replyModalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={postStyles.modalOverlay}
          >
            <View style={postStyles.modalContent}>
              <TextInput
                placeholder="Write a reply"
                value={replyText}
                onChangeText={setReplyText}
                style={postStyles.input}
                multiline
              />
              {replyImage && (
                <Image source={{ uri: replyImage }} style={postStyles.preview} />
              )}
              <View style={postStyles.buttonRow}>
                <Button title="Add Image" onPress={pickReplyImage} />
                <Button title="Post" onPress={handleReplySubmit} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  };

  const RepliesTab = () => (
    <View style={styles.tabContainer}>
      <Text style={{ color: 'white' }}>Replies tab</Text>
    </View>
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
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: { backgroundColor: 'transparent', marginTop: 0 },
          tabBarLabelStyle: { color: 'white', fontWeight: 'bold' },
          tabBarIndicatorStyle: { backgroundColor: '#7814db' },
        }}
        style={{ flex: 1 }}
      >
        <Tab.Screen name="Posts" component={PostsTab} />
        <Tab.Screen name="Replies" component={RepliesTab} />
      </Tab.Navigator>
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
  tabContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

});

const postStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
    backgroundColor: colors.background,
  },
  input: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    padding: 20,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginTop: 8,
  },
});
