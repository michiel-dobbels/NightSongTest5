import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';

import { supabase, REPLY_VIDEO_BUCKET } from '../../lib/supabase';
import { uploadImage } from '../../lib/uploadImage';
import { getLikeCounts } from '../../lib/getLikeCounts';
import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';
import { replyEvents } from '../replyEvents';
import { usePostStore } from '../contexts/PostStoreContext';
import { postEvents } from '../postEvents';
import PostCard, { Post } from '../components/PostCard';
import { CONFIRM_ACTION } from '../constants/ui';
import ReplyModal from '../components/ReplyModal';
import { useStory } from '../contexts/StoryContext';

const REPLY_STORAGE_PREFIX = 'cached_replies_';
const COUNT_STORAGE_KEY = 'cached_reply_counts';
const LIKE_COUNT_KEY = 'cached_like_counts';
const LIKED_KEY_PREFIX = 'cached_likes_';

const TAB_BAR_HEIGHT = Dimensions.get('window').height * 0.1;
const TAB_BAR_COLOR = 'rgba(44,44,84,0.9)';




interface Reply {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  image_url?: string;
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
}

export default function PostDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const {
    user,
    profile,
    profileImageUri,
    bannerImageUri,
    removePost,
  } = useAuth()!;
  const { initialize, remove } = usePostStore();
  const { openUserStories } = useStory();
  const post = route.params.post as Post;
  const fromProfile = route.params?.fromProfile ?? false;

  const STORAGE_KEY = `${REPLY_STORAGE_PREFIX}${post.id}`;

  const [replies, setReplies] = useState<Reply[]>([]);
  const [allReplies, setAllReplies] = useState<Reply[]>([]);
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: number }>({});

  const [quickReplyModalVisible, setQuickReplyModalVisible] = useState(false);
  const [quickReplyTarget, setQuickReplyTarget] = useState<{
    postId: string;
    parentId: string | null;
  } | null>(null);

  const [storyMap, setStoryMap] = useState<Record<string, boolean>>({});


  const [keyboardOffset, setKeyboardOffset] = useState(0);

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
    remove(id);
    await removePost(id);
    await supabase.from('posts').delete().eq('id', id);

    navigation.goBack();
  };


  const confirmDeleteReply = (id: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      CONFIRM_ACTION,
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDeleteReply(id),
      },
    ]);
  };

  const handleDeleteReply = async (id: string) => {
    setReplies(prev => {
      const updated = prev.filter(r => r.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setAllReplies(prev => {
      const descendants = new Set<string>();
      const gather = (parentId: string) => {
        prev.forEach(r => {
          if (r.parent_id === parentId) {
            descendants.add(r.id);
            gather(r.id);
          }
        });
      };
      gather(id);
      return prev.filter(r => r.id !== id && !descendants.has(r.id));
    });
    setReplyCounts(prev => {
      const descendants = new Set<string>();
      const gather = (parentId: string) => {
        allReplies.forEach(r => {
          if (r.parent_id === parentId) {
            descendants.add(r.id);
            gather(r.id);
          }
        });
      };
      gather(id);
      let removed = descendants.size + 1;
      const { [id]: _omit, ...rest } = prev;
      descendants.forEach(d => delete rest[d]);
      const counts = { ...rest, [post.id]: (prev[post.id] || 0) - removed };
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
      return counts;
    });

    await supabase.from('replies').delete().eq('id', id);
    remove(id);
    fetchReplies();
  };

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboardOffset(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardOffset(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const refreshCounts = useCallback(async () => {
    const stored = await AsyncStorage.getItem(COUNT_STORAGE_KEY);
    if (stored) {
      try {
        setReplyCounts(prev => ({ ...prev, ...JSON.parse(stored) }));
      } catch (e) {
        console.error('Failed to parse cached counts', e);
      }
    }
    const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);
    if (likeStored) {
      try {
        const parsed = JSON.parse(likeStored);
        initialize(
          Object.entries(parsed).map(([id, c]) => ({
            id,
            like_count: c as number,
          })),
        );
      } catch (e) {
        console.error('Failed to parse cached like counts', e);
      }
    }
    if (user) {
      const likedStored = await AsyncStorage.getItem(`${LIKED_KEY_PREFIX}${user.id}`);
      if (likedStored) {
        try {
          JSON.parse(likedStored);
        } catch (e) {
          console.error('Failed to parse cached likes', e);
        }

      }
    }
  }, [initialize, user?.id]);

  const fetchReplies = useCallback(async () => {
    const { data, error } = await supabase
      .from('replies')
      .select(
        'id, post_id, parent_id, user_id, content, image_url, video_url, created_at, reply_count, like_count, username, profiles(username, name, image_url, banner_url)'
      )


      .eq('post_id', post.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      const all = data as Reply[];
      setAllReplies(all);
      const topLevel = all.filter(r => r.parent_id === null);
      setReplies(prev => {
        const tempReplies = prev.filter(r => r.id.startsWith('temp-'));
        const merged = [...tempReplies, ...topLevel];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });

      const { data: postData } = await supabase
        .from('posts')
        .select('reply_count, like_count')
        .eq('id', post.id)
        .single();
      setReplyCounts(prev => {
        const counts = { ...prev };
        all.forEach(r => {
          counts[r.id] = prev[r.id] ?? r.reply_count ?? 0;
        });
        counts[post.id] =
          prev[post.id] ??
          (postData ? postData.reply_count ?? all.length : post.reply_count ?? all.length);
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
        return counts;
      });
      const ids = [post.id, ...all.map(r => r.id)];
      const likeCounts = await getLikeCounts(ids);
      initialize(ids.map(id => ({ id, like_count: likeCounts[id] })));



      if (user) {
        const { data: likedData } = await supabase
          .from('likes')
          .select('post_id, reply_id')
          .eq('user_id', user.id);
        if (likedData) {
          const map: any = {};
          likedData.forEach((l: any) => {
            const key = l.post_id || l.reply_id;
            map[key] = true;
          });
          AsyncStorage.setItem(
            `${LIKED_KEY_PREFIX}${user.id}`,
            JSON.stringify(map),
          );
        }
      }

      
      if (user) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('post_id, reply_id')
          .eq('user_id', user.id);
        if (likeData) {
          const likedObj: { [key: string]: boolean } = {};
          likeData.forEach(l => {
            if (l.post_id) likedObj[l.post_id] = true;
            if (l.reply_id) likedObj[l.reply_id] = true;
          });
          AsyncStorage.setItem(
            `${LIKED_KEY_PREFIX}${user.id}`,
            JSON.stringify(likedObj),
          );
        }
      }


    }
  }, [post.id, initialize, user?.id]);

  useEffect(() => {
    refreshCounts();
    fetchReplies();
  }, [refreshCounts, fetchReplies]);

  useEffect(() => {
    const ids = new Set<string>();
    ids.add(post.user_id);
    replies.forEach(r => ids.add(r.user_id));
    const fetchStories = async () => {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('stories')
        .select('user_id')
        .gt('created_at', since)
        .in('user_id', Array.from(ids));
      if (data) {
        const map: Record<string, boolean> = {};
        data.forEach(d => {
          map[d.user_id] = true;
        });
        setStoryMap(map);
      }
    };
    fetchStories();
  }, [replies]);

  useEffect(() => {
    const loadCached = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const countStored = await AsyncStorage.getItem(COUNT_STORAGE_KEY);
      const likeStored = await AsyncStorage.getItem(LIKE_COUNT_KEY);

      let storedCounts: { [key: string]: number } = {};
      let storedLikes: { [key: string]: number } = {};

      if (countStored) {
        try {
          storedCounts = JSON.parse(countStored);
        } catch (e) {
          console.error('Failed to parse cached counts', e);
        }
      }

      if (likeStored) {
        try {
          storedLikes = JSON.parse(likeStored);
        } catch (e) {
          console.error('Failed to parse cached like counts', e);
        }
      }

      if (stored) {
        try {
          const cached = JSON.parse(stored);
          setReplies(cached);
          setAllReplies(cached);

          const entries = cached.map((r: any) => [r.id, storedCounts[r.id] ?? r.reply_count ?? 0]);
          entries.push([post.id, storedCounts[post.id] ?? post.reply_count ?? cached.length]);
          const counts = { ...storedCounts, ...Object.fromEntries(entries) };
          setReplyCounts(counts);
          AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));

          const likeEntries = cached.map((r: any) => [r.id, storedLikes[r.id] ?? r.like_count ?? 0]);

          likeEntries.push([post.id, storedLikes[post.id] ?? post.like_count ?? 0]);
          const likeCountsObj = {
            ...Object.fromEntries(likeEntries),
            ...storedLikes,
          } as Record<string, number>;
          initialize([
            { id: post.id, like_count: likeCountsObj[post.id] ?? 0 },
            ...cached.map((r: any) => ({ id: r.id, like_count: likeCountsObj[r.id] ?? 0 })),
          ]);
        } catch (e) {
          console.error('Failed to parse cached replies', e);
        }
      } else {
        setReplyCounts(storedCounts);
        const items = Object.keys(storedLikes).length
          ? Object.entries(storedLikes).map(([id, c]) => ({
              id,
              like_count: c as number,
            }))
          : [
              {
                id: post.id,
                like_count: storedLikes[post.id] ?? post.like_count ?? 0,
              },
            ];
        initialize(items);


      }

      if (user) {
        const likedStored = await AsyncStorage.getItem(
          `${LIKED_KEY_PREFIX}${user.id}`,
        );
        if (likedStored) {
          try {
            JSON.parse(likedStored);
          } catch (e) {
            console.error('Failed to parse cached likes', e);
          }
        }

        const legacyLiked = await AsyncStorage.getItem('LIKE_STATE_KEY');
        if (legacyLiked) {
          try {
            const parsed = JSON.parse(legacyLiked);
            AsyncStorage.setItem(
              `${LIKED_KEY_PREFIX}${user.id}`,
              JSON.stringify(parsed),
            );
          } catch (e) {
            console.error('Failed to parse cached likes', e);
          }
        }
      }

      fetchReplies();
    };

    loadCached();
  }, []);

  const openQuickReplyModal = (postId: string, parentId: string | null) => {
    setQuickReplyTarget({ postId, parentId });
    setQuickReplyModalVisible(true);
  };

  const handleQuickReplySubmit = async (
    text: string,
    image: string | null,
    video: string | null,
  ) => {
    if (!quickReplyTarget || (!text.trim() && !image && !video) || !user) {
      setQuickReplyModalVisible(false);
      return;
    }


    setQuickReplyModalVisible(false);

    const newReply: Reply = {
      id: `temp-${Date.now()}`,
      post_id: quickReplyTarget.postId,
      parent_id: quickReplyTarget.parentId,
      user_id: user.id,
      content: text,
      image_url: image ?? undefined,
      video_url: video ?? undefined,
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
    };

    if (quickReplyTarget.parentId === null) {
      setReplies(prev => {
        const updated = [newReply, ...prev];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }

    setAllReplies(prev => [...prev, newReply]);
    setReplyCounts(prev => {
      const counts = { ...prev };
      counts[post.id] = (counts[post.id] || 0) + 1;
      if (quickReplyTarget.parentId) {
        counts[quickReplyTarget.parentId] =
          (counts[quickReplyTarget.parentId] || 0) + 1;
      }
      counts[newReply.id] = 0;
      AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
      return counts;
    });
    initialize([{ id: newReply.id, like_count: 0 }]);


    let uploadedUrl: string | null = null;
    let uploadedImage: string | null = null;
    if (video) {

      try {
        const ext = video.split('.').pop() || 'mp4';
        const path = `${user.id}-${Date.now()}.${ext}`;
        const resp = await fetch(video);
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

    if (image && !image.startsWith('http')) {
      uploadedImage = await uploadImage(image, user.id);
      if (!uploadedImage) uploadedImage = image;
    } else if (image) {
      uploadedImage = image;
    }

    let { data, error } = await supabase
      .from('replies')
      .insert([
        {
          post_id: quickReplyTarget.postId,
          parent_id: quickReplyTarget.parentId,
          user_id: user.id,
          content: text,
          image_url: uploadedImage,
          video_url: uploadedUrl,
          username: profile.name || profile.username,
        },
      ])
      .select()
      .single();

    if (error?.code === 'PGRST204') {
      error = null;
    }

    if (!error && data) {
      if (quickReplyTarget.parentId === null) {
        setReplies(prev =>
          prev.map(r =>
            r.id === newReply.id
              ? { ...r, id: data.id, created_at: data.created_at, reply_count: 0 }
              : r,
          ),
        );
      }
      setAllReplies(prev =>
        prev.map(r =>
          r.id === newReply.id ? { ...r, id: data.id, created_at: data.created_at } : r,
        ),
      );
      setReplyCounts(prev => {
        const temp = prev[newReply.id] ?? 0;
        const { [newReply.id]: _omit, ...rest } = prev;
        const counts = { ...rest, [data.id]: temp };
        if (quickReplyTarget.parentId) {
          counts[quickReplyTarget.parentId] = counts[quickReplyTarget.parentId] || 0;
        }
        AsyncStorage.setItem(COUNT_STORAGE_KEY, JSON.stringify(counts));
        return counts;
      });
      initialize([{ id: data.id, like_count: 0 }]);
    }
    fetchReplies();
  };



  const displayName = post.profiles?.name || post.profiles?.username || post.username;
  const userName = post.profiles?.username || post.username;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <View style={styles.backButton}>
        <Button
          title="Return"
          onPress={() => (fromProfile ? navigation.navigate('Profile') : navigation.goBack())}
        />
      </View>
      <FlatList
        ListHeaderComponent={() => (
          <PostCard
            post={post}
            isOwner={user?.id === post.user_id}
            avatarUri={
              user?.id === post.user_id ? profileImageUri : post.profiles?.image_url || undefined
            }
            bannerUrl={user?.id === post.user_id ? undefined : post.profiles?.banner_url || undefined}
            imageUrl={post.image_url ?? undefined}
            videoUrl={post.video_url ?? undefined}
            hasStory={storyMap[post.user_id]}
            replyCount={replyCounts[post.id] || 0}
            onPress={() => {}}
            onProfilePress={() =>
              user?.id === post.user_id
                ? navigation.navigate('Profile')
                : navigation.navigate('OtherUserProfile', {
                    userId: post.user_id,
                  })
            }

            onAvatarPress={async () => {
              const opened = await openUserStories(post.user_id);
              if (!opened) {
                user?.id === post.user_id
                  ? navigation.navigate('Profile')
                  : navigation.navigate('OtherUserProfile', { userId: post.user_id });
              }
            }}

            onDelete={() => confirmDeletePost(post.id)}
            onOpenReplies={() => openQuickReplyModal(post.id, null)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        data={replies}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const name = item.profiles?.name || item.profiles?.username || item.username;
          const replyUserName = item.profiles?.username || item.username;
          const isMe = user?.id === item.user_id;
          const avatarUri = isMe ? profileImageUri : item.profiles?.image_url || undefined;

          return (
            <PostCard
              post={item as Post}
              isOwner={isMe}
              avatarUri={avatarUri}
              bannerUrl={item.profiles?.banner_url || undefined}
              imageUrl={item.image_url ?? undefined}
              videoUrl={item.video_url ?? undefined}
              hasStory={storyMap[item.user_id]}
              replyCount={replyCounts[item.id] || 0}
              onPress={() =>
                navigation.push('ReplyDetail', {
                  reply: item,
                  originalPost: post,
                  ancestors: [],
                })
              }
              onProfilePress={() =>
                isMe
                  ? navigation.navigate('Profile')
                  : navigation.navigate('OtherUserProfile', {
                      userId: item.user_id,
                    })
              }
              onAvatarPress={async () => {
                const opened = await openUserStories(item.user_id);
                if (!opened) {
                  isMe
                    ? navigation.navigate('Profile')
                    : navigation.navigate('OtherUserProfile', { userId: item.user_id });
                }
              }}
              onDelete={() => confirmDeleteReply(item.id)}
              onOpenReplies={() => openQuickReplyModal(post.id, item.id)}
            />
          );
        }}
      />

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => openQuickReplyModal(post.id, null)}
        style={[styles.quickReplyBar, { bottom: TAB_BAR_HEIGHT + keyboardOffset }]}
      >
        <Text style={styles.quickReplyPlaceholder}>Write a reply...</Text>
      </TouchableOpacity>


      <ReplyModal
        visible={quickReplyModalVisible}
        onSubmit={handleQuickReplySubmit}
        onClose={() => setQuickReplyModalVisible(false)}
      />

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 100,
    paddingBottom: 0,
    backgroundColor: colors.background,
  },
  input: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    color: colors.text,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
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
  quickReplyBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: TAB_BAR_HEIGHT,
    backgroundColor: TAB_BAR_COLOR,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  quickReplyPlaceholder: {
    color: '#888',

  },
});
