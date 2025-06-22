import React, { useCallback, useState, useEffect } from 'react';

import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../../AuthContext';
import { usePostStore } from '../contexts/PostStoreContext';
import { useFollowCounts } from '../hooks/useFollowCounts';
import { colors } from '../styles/colors';
import { supabase, REPLY_VIDEO_BUCKET } from '../../lib/supabase';
import { getLikeCounts } from '../../lib/getLikeCounts';
import PostCard, { Post } from '../components/PostCard';
import ReplyCard, { Reply } from '../components/ReplyCard';
import ReplyThread from '../components/ReplyThread';

import { replyEvents } from '../replyEvents';
import { likeEvents } from '../likeEvents';

import { CONFIRM_ACTION } from '../constants/ui';

const COUNT_STORAGE_KEY = 'cached_reply_counts';
const REPLY_STORAGE_PREFIX = 'cached_replies_';
const PAGE_SIZE = 10;

interface PostItemProps {
  item: Post;
  avatarUri?: string;
  bannerUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  replyCount: number;
  onPress: () => void;
  onProfilePress: () => void;
  onDelete: () => void;
  onOpenReplies: () => void;
}

const PostItem = React.memo(function PostItem({
  item,
  avatarUri,
  bannerUrl,
  imageUrl,
  videoUrl,
  replyCount,
  onPress,
  onProfilePress,
  onDelete,
  onOpenReplies,
}: PostItemProps) {
  return (
    <PostCard
      post={item}
      isOwner={true}
      avatarUri={avatarUri}
      bannerUrl={bannerUrl}
      imageUrl={imageUrl}
      videoUrl={videoUrl}
      replyCount={replyCount}
      onPress={onPress}
      onProfilePress={onProfilePress}
      onDelete={onDelete}
      onOpenReplies={onOpenReplies}
    />
  );
});

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const {
    profile,
    profileImageUri,
    setProfileImageUri,
    bannerImageUri,
    setBannerImageUri,
    myPosts,
    removePost,
    updatePost,
  } = useAuth()!;
  const { initialize, remove, getState } = usePostStore();

  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [replyVideo, setReplyVideo] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [repliesLoadingMore, setRepliesLoadingMore] = useState(false);
  const [repliesHasMore, setRepliesHasMore] = useState(true);

  const { followers, following } = useFollowCounts(profile?.id ?? null);

  useEffect(() => {
    const syncLikes = async () => {
      if (myPosts && myPosts.length) {
        const missing = myPosts.filter((p) => !getState(p.id));
        if (missing.length) {
          const counts = await getLikeCounts(missing.map((p) => p.id));
          initialize(
            missing.map((p) => ({ id: p.id, like_count: counts[p.id] })),
          );
        }
      }
    };
    syncLikes();
  }, [myPosts, getState, initialize]);

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
      setReplyCounts((prev) => {
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
    const onLikeChanged = ({
      id,
      count,
      liked,
    }: {
      id: string;
      count: number;
      liked: boolean;
    }) => {
      updatePost(id, { like_count: count, liked });
    };
    likeEvents.on('likeChanged', onLikeChanged);
    return () => {
      likeEvents.off('likeChanged', onLikeChanged);
    };
  }, [updatePost]);

  const confirmDeletePost = (id: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      CONFIRM_ACTION,

      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDeletePost(id),
      },
    ]);
  };

  const handleDeletePost = async (id: string) => {
    setReplyCounts((prev) => {
      const { [id]: _removed, ...rest } = prev;
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(rest));
      return rest;
    });
    remove(id);
    await supabase.from('posts').delete().eq('id', id);
    await removePost(id);
  };

  const openReplyModal = (postId: string) => {
    setActivePostId(postId);
    setReplyText('');
    setReplyImage(null);
    setReplyVideo(null);
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

  const pickReplyVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const info = await FileSystem.getInfoAsync(uri);
      if (info.size && info.size > 20 * 1024 * 1024) {
        Alert.alert('Video too large', 'Please select a video under 20MB.');
        return;
      }
      setReplyVideo(uri);
    }
  };

  const handleReplySubmit = async () => {
    if (
      !activePostId ||
      (!replyText.trim() && !replyImage && !replyVideo) ||
      !profile
    ) {
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
      video_url: replyVideo ?? undefined,
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

    setReplyCounts((prev) => {
      const counts = {
        ...prev,
        [activePostId]: (prev[activePostId] || 0) + 1,
        [newReply.id]: 0,
      };
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
      return counts;
    });
    initialize([{ id: newReply.id, like_count: 0 }]);

    setReplyText('');
    setReplyImage(null);
    setReplyVideo(null);

    let uploadedUrl = null;
    if (replyVideo) {
      try {
        const ext = replyVideo.split('.').pop() || 'mp4';
        const path = `${profile.id}-${Date.now()}.${ext}`;
        const resp = await fetch(replyVideo);
        const blob = await resp.blob();
        const { error: uploadError } = await supabase.storage
          .from(REPLY_VIDEO_BUCKET)
          .upload(path, blob);
        if (!uploadError) {
          const { publicURL } = supabase.storage
            .from(REPLY_VIDEO_BUCKET)
            .getPublicUrl(path);
          uploadedUrl = publicURL;
        }
      } catch (e) {
        console.error('Video upload failed', e);
      }
    }

    let { data, error } = await supabase
      .from('replies')
      .insert({
        post_id: activePostId,
        parent_id: null,
        user_id: profile.id,
        content: replyText,
        image_url: replyImage,
        video_url: uploadedUrl,
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
          r.id === newReply.id
            ? { ...r, id: data.id, created_at: data.created_at }
            : r,
        );
        await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update cached reply', e);
      }
      setReplyCounts((prev) => {
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

  const handleReplyCancel = () => {
    setReplyText('');
    setReplyImage(null);
    setReplyVideo(null);
    setReplyModalVisible(false);
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
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
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
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      setBannerImageUri(`data:image/jpeg;base64,${base64}`);
    }
  };

  const fetchPostsPage = useCallback(
    async (offset = 0, append = false) => {
      if (!profile?.id) return;
      if (offset === 0) setPostsLoadingMore(true);
      else setPostsLoadingMore(true);
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id, content, image_url, video_url, user_id, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)',
        )
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (!error && data) {
        const list = data as Post[];
        setPosts((prev) => {
          const prevMap = Object.fromEntries(
            prev.map((p) => [p.id, p.reply_count ?? 0]),
          );
          const combined = append ? [...prev, ...list] : list;
          const seen = new Set<string>();
          const merged = combined.map((p) => ({
            ...p,
            reply_count: Math.max(p.reply_count ?? 0, prevMap[p.id] ?? 0),
          }));
          return merged.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
        });
        setReplyCounts((prev) => {
          const counts = { ...prev };
          list.forEach((p) => {
            const current = counts[p.id] ?? 0;
            const incoming = p.reply_count ?? 0;
            counts[p.id] = Math.max(current, incoming);
          });
          return counts;
        });
        setPostsHasMore(list.length === PAGE_SIZE);
        const counts = await getLikeCounts(list.map((p) => p.id));
        initialize(list.map((p) => ({ id: p.id, like_count: counts[p.id] })));
      } else if (error) {
        console.error('Failed to fetch posts', error);
      }
      setPostsLoadingMore(false);
    },
    [profile?.id, initialize],
  );

  const fetchReplies = useCallback(
    async (offset = 0, append = false) => {
      if (!profile?.id) return;
      if (offset === 0) setRepliesLoadingMore(true);
      else setRepliesLoadingMore(true);
      const { data, error } = await supabase
        .from('replies')
        .select(
          'id, post_id, parent_id, user_id, content, image_url, video_url, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)',
        )
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (!error && data) {
        const list = data as Reply[];
        setReplies((prev) => {
          const combined = append ? [...prev, ...list] : list;
          const seen = new Set<string>();
          return combined.filter((r) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          });
        });
        setRepliesHasMore(list.length === PAGE_SIZE);
        setReplyCounts((prev) => {
          const counts = { ...prev };
          list.forEach((r) => {
            counts[r.id] = r.reply_count ?? 0;
          });
          return counts;
        });
        const counts = await getLikeCounts(list.map((r) => r.id));
        initialize(list.map((r) => ({ id: r.id, like_count: counts[r.id] })));
      } else if (error) {
        console.error('Failed to fetch replies', error);
      }
      setRepliesLoadingMore(false);
    },
    [profile?.id, initialize],
  );

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

  const [activeTab, setActiveTab] = useState<'posts' | 'replies'>('posts');

  useEffect(() => {
    if (activeTab === 'replies') {
      fetchReplies(0);
    } else {
      fetchPostsPage(0);
    }
  }, [activeTab, fetchReplies, fetchPostsPage]);

  const renderTabs = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'posts' && styles.activeTab]}
        onPress={() => setActiveTab('posts')}
      >
        <Text style={styles.tabLabel}>Posts</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'replies' && styles.activeTab]}
        onPress={() => setActiveTab('replies')}
      >
        <Text style={styles.tabLabel}>Replies</Text>
      </TouchableOpacity>
    </View>
  );

  const data = activeTab === 'posts' ? posts : replies;

  const renderItem = ({ item }: { item: any }) =>
    activeTab === 'posts' ? (
      <PostItem
        item={item as Post}
        avatarUri={profileImageUri ?? undefined}
        bannerUrl={bannerImageUri ?? undefined}
        imageUrl={item.image_url ?? undefined}
        videoUrl={item.video_url ?? undefined}
        replyCount={replyCounts[item.id] ?? item.reply_count ?? 0}
        onPress={() => navigation.navigate('PostDetail', { post: item })}
        onProfilePress={() => navigation.navigate('Profile')}
        onDelete={() => confirmDeletePost(item.id)}
        onOpenReplies={() => openReplyModal(item.id)}
      />
    ) : (
      <ReplyThread
        reply={item as Reply}
        isOwner={true}
        avatarUri={profileImageUri ?? undefined}
        bannerUrl={bannerImageUri ?? undefined}
        onPress={(r) =>
          navigation.navigate('ReplyDetail', {
            reply: r,
            originalPost: undefined,
            ancestors: [],
          })
        }
        onProfilePress={(id) =>
          id === profile?.id
            ? navigation.navigate('Profile')
            : navigation.navigate('OtherUserProfile', { userId: id })
        }
        onDelete={() => {}}
      />
    );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        data={data}
        keyExtractor={(item: any) => item.id}
        removeClippedSubviews
        initialNumToRender={10}
        windowSize={5}
        onEndReached={() => {
          if (activeTab === 'posts' && postsHasMore && !postsLoadingMore) {
            fetchPostsPage(posts.length, true);
          }
          if (
            activeTab === 'replies' &&
            repliesHasMore &&
            !repliesLoadingMore
          ) {
            fetchReplies(replies.length, true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          (activeTab === 'posts' && postsLoadingMore) ||
          (activeTab === 'replies' && repliesLoadingMore) ? (
            <ActivityIndicator color="white" style={{ marginVertical: 10 }} />
          ) : null
        }
        ListHeaderComponent={() => (
          <>
            {renderHeader()}
            {renderTabs()}
          </>
        )}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>
            {activeTab === 'posts' ? 'No posts yet.' : 'No replies yet.'}
          </Text>
        )}
        renderItem={renderItem}
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
            {!replyImage && replyVideo && (
              <Video
                source={{ uri: replyVideo }}
                style={styles.preview}
                useNativeControls
                isMuted
                resizeMode="contain"
              />
            )}
            <View style={styles.buttonRow}>
              <Button title="Add Image" onPress={pickReplyImage} />
              <Button title="Add Video" onPress={pickReplyVideo} />
              <Button title="Post" onPress={handleReplySubmit} />
              <Button title="Cancel" onPress={handleReplyCancel} />
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
    backgroundColor: '#555',
  },
  textContainer: {
    marginLeft: 15,
  },
  username: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  name: {
    color: colors.text,
    fontSize: 20,
    marginTop: 4,
  },
  uploadLink: {
    marginTop: 20,
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  uploadText: { color: colors.text },
  statsRow: { flexDirection: 'row', marginLeft: 15, marginBottom: 20 },
  statsText: { color: colors.text, marginRight: 15 },
  headerContainer: {
    padding: 20,
  },
  input: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    color: colors.text,
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
  tabBar: {
    flexDirection: 'row',
    borderBottomColor: '#444',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabLabel: {
    color: colors.text,
    fontWeight: 'bold',
  },
  activeTab: {
    borderBottomColor: colors.accent,
    borderBottomWidth: 2,
  },
  emptyText: {
    color: colors.text,
    textAlign: 'center',
    padding: 20,
  },
});
