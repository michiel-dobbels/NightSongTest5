import React, { useCallback, useState, useEffect } from 'react';


import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../../AuthContext';
import { usePostStore } from '../contexts/PostStoreContext';
import { useFollowCounts } from '../hooks/useFollowCounts';
import { colors } from '../styles/colors';
import { supabase } from '../../lib/supabase';
import { getLikeCounts } from '../../lib/getLikeCounts';
import PostCard, { Post } from '../components/PostCard';
import { replyEvents } from '../replyEvents';
import { postEvents } from '../postEvents';
import { likeEvents } from '../likeEvents';

const CANCEL_ACTION = { text: 'Confirm', style: 'cancel' } as const;

const STORAGE_KEY = 'cached_posts';
const COUNT_STORAGE_KEY = 'cached_reply_counts';
const REPLY_STORAGE_PREFIX = 'cached_replies_';











export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const {
    profile,
    profileImageUri,
    setProfileImageUri,
    bannerImageUri,
    setBannerImageUri,
    myPosts: posts,
    fetchMyPosts,
    removePost,
  } = useAuth() as any;
  const { initialize, remove } = usePostStore();

  const [myPosts, setMyPosts] = useState<Post[]>(posts ?? []);

  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);

  const { followers, following } = useFollowCounts(profile?.id ?? null);

  useEffect(() => {
    const syncLikes = async () => {
      if (posts && posts.length) {
        const counts = await getLikeCounts(posts.map(p => p.id));
        initialize(posts.map(p => ({ id: p.id, like_count: counts[p.id] })));
        const seen = new Set<string>();
        const unique = posts.filter(p => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        setMyPosts(unique);
      } else {
        setMyPosts([]);
      }
    };
    syncLikes();

  }, [posts]);

  useEffect(() => {
    const loadCounts = async () => {
      const stored = await AsyncStorage.getItem(COUNT_STORAGE_KEY);
      if (stored) {
        try {
          setReplyCounts(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse cached counts', e);
        }
      }
    };
    loadCounts();
  }, []);

  useEffect(() => {
    const onReplyAdded = (postId: string) => {
      setReplyCounts(prev => {
        const updated = { ...prev, [postId]: (prev[postId] || 0) + 1 };
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    };
    replyEvents.on('replyAdded', onReplyAdded);
    return () => {
      replyEvents.off('replyAdded', onReplyAdded);
    };
  }, []);

  useEffect(() => {
    const onPostDeleted = (postId: string) => {
      setMyPosts(prev => {
        const updated = prev.filter(p => p.id !== postId);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      setReplyCounts(prev => {
        const { [postId]: _omit, ...rest } = prev;
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(rest));
        return rest;
      });
    };
    postEvents.on('postDeleted', onPostDeleted);
    return () => {
      postEvents.off('postDeleted', onPostDeleted);
    };
  }, []);

  useEffect(() => {
    const onLikeChanged = ({ id, count }: { id: string; count: number }) => {
      setMyPosts(prev => {
        const updated = prev.map(p => (p.id === id ? { ...p, like_count: count } : p));
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    };
    likeEvents.on('likeChanged', onLikeChanged);
    return () => {
      likeEvents.off('likeChanged', onLikeChanged);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!posts || posts.length === 0) {
        fetchMyPosts();
      }
      const syncCounts = async () => {
        const stored = await AsyncStorage.getItem(COUNT_STORAGE_KEY);
        if (stored) {
          try {
            setReplyCounts(JSON.parse(stored));
          } catch (e) {
            console.error('Failed to parse cached counts', e);
          }
        }
      };
      syncCounts();
    }, [fetchMyPosts, posts?.length]),
  );

  const confirmDeletePost = (id: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      CANCEL_ACTION,
      { text: 'Delete', style: 'destructive', onPress: () => handleDeletePost(id) },
    ]);
  };

  const handleDeletePost = async (id: string) => {
    setMyPosts(prev => {
      const updated = prev.filter(p => p.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setReplyCounts(prev => {
      const { [id]: _removed, ...rest } = prev;
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(rest));
      return rest;
    });
    await supabase.from('posts').delete().eq('id', id);
    remove(id);
    await removePost(id);
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
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      setReplyImage(`data:image/jpeg;base64,${base64}`);
    }
  };

  const handleReplySubmit = async () => {
    if (!activePostId || (!replyText.trim() && !replyImage) || !profile) {
      setReplyModalVisible(false);
      return;
    }

    setReplyModalVisible(false);

    const newReply = {
      id: `temp-${Date.now()}`,
      post_id: activePostId,
      parent_id: null,
      user_id: profile.id,
      content: replyText,
      image_url: replyImage ?? undefined,
      created_at: new Date().toISOString(),
      username: profile.name || profile.username,
      reply_count: 0,
      like_count: 0,
      profiles: {
        username: profile.username,
        name: profile.name,
        image_url: profileImageUri,
        banner_url: bannerImageUri,
      },
    } as const;

    const storageKey = `${REPLY_STORAGE_PREFIX}${activePostId}`;
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      const cached = stored ? JSON.parse(stored) : [];
      const updated = [newReply, ...cached];
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to cache reply', e);
    }

    setReplyCounts(prev => {
      const counts = { ...prev, [activePostId]: (prev[activePostId] || 0) + 1, [newReply.id]: 0 };
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
      return counts;
    });
    initialize([{ id: newReply.id, like_count: 0 }]);

    setReplyText('');
    setReplyImage(null);

    let { data, error } = await supabase
      .from('replies')
      .insert({
        post_id: activePostId,
        parent_id: null,
        user_id: profile.id,
        content: replyText,
        image_url: replyImage,
        username: profile.name || profile.username,
      })
      .select()
      .single();
    if (error?.code === 'PGRST204') {
      error = null;
    }

    if (!error && data) {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        const cached = stored ? JSON.parse(stored) : [];
        const updated = cached.map((r: any) =>
          r.id === newReply.id ? { ...r, id: data.id, created_at: data.created_at } : r,
        );
        await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update cached reply', e);
      }
      setReplyCounts(prev => {
        const temp = prev[newReply.id] ?? 0;
        const { [newReply.id]: _omit, ...rest } = prev;
        const counts = { ...rest, [data.id]: temp };
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
        return counts;
      });
      initialize([{ id: data.id, like_count: 0 }]);
      replyEvents.emit('replyAdded', activePostId);
    } else if (error) {
      console.error('Reply failed', error.message);
    }
  };



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

  const renderHeader = () => (
    <View style={styles.headerContainer}>
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
          {profile.name && <Text style={styles.name}>{profile.name}</Text>}
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

    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        data={myPosts}
        ListHeaderComponent={renderHeader}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item as Post}
            isOwner={true}
            avatarUri={profileImageUri ?? undefined}
            bannerUrl={bannerImageUri ?? undefined}
            replyCount={replyCounts[item.id] ?? item.reply_count ?? 0}
            onPress={() => navigation.navigate('PostDetail', { post: item })}
            onProfilePress={() => navigation.navigate('Profile')}
            onDelete={() => confirmDeletePost(item.id)}
            onOpenReplies={() => openReplyModal(item.id)}
          />
        )}
      />
      <Modal visible={replyModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <TextInput
              placeholder="Write a reply"
              value={replyText}
              onChangeText={setReplyText}
              style={styles.input}
              multiline
            />
            {replyImage && (
              <Image source={{ uri: replyImage }} style={styles.preview} />
            )}
            <View style={styles.buttonRow}>
              <Button title="Add Image" onPress={pickReplyImage} />
              <Button title="Post" onPress={handleReplySubmit} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 0,
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
  headerContainer: {
    padding: 20,
  },
  input: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
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


});
