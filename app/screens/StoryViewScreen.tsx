import React, { useState, useRef, useEffect } from 'react';
  import {
    View,
    StyleSheet,
    Image,
    Pressable,
    Text,
    Alert,
    TouchableOpacity,
    PanResponder,
    Animated,
  } from 'react-native';

import { Video } from 'expo-av';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../styles/colors';
import { useStories } from '../contexts/StoryStoreContext';
import { useAuth } from '../../AuthContext';
import { supabase } from '../../lib/supabase';


export default function StoryViewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth()!;
  const { userId } = route.params as { userId: string };
  const { getStoriesForUser, removeStory } = useStories();

  const stories = getStoriesForUser(userId);
  const [index, setIndex] = useState(0);
  const story = stories[index];
  const [profile, setProfile] = useState<{ name: string | null; username: string | null; avatar_url: string | null } | null>(null);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      let { data, error } = await supabase
        .from('profiles')
        .select('username, name, avatar_url, image_url')
        .eq('id', userId)
        .single();
      if (error?.code === '42703') {
        const retry = await supabase
          .from('profiles')
          .select('username, display_name, image_url')
          .eq('id', userId)
          .single();
        data = retry.data as any;
        error = retry.error;
      }
      if (!error && data && isMounted) {
        setProfile({
          username: (data as any).username ?? null,
          name:
            (data as any).name ??
            (data as any).display_name ??
            (data as any).full_name ??
            null,
          avatar_url:
            (data as any).avatar_url ??
            (data as any).image_url ??
            null,
        });
      }
    };
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) next();
    });
  }, [index]);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) next();
    });
  }, [index]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 10,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 50) {
          navigation.goBack();
        }

      },
    }),
  ).current;


  const resetProgress = () => {
    progress.stopAnimation();
    progress.setValue(0);
  };

  const next = () => {
    resetProgress();

    if (index < stories.length - 1) {
      setIndex(i => i + 1);
    }
  };

  const prev = () => {
    resetProgress();

    if (index > 0) {
      setIndex(i => i - 1);
    }
  };

  const confirmDelete = () => {
    if (!story) return;
    if (!user || user.id !== story.userId) return;

    Alert.alert(
      'Are you sure you want to delete this story?',
      '',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeStory(story.id);
            const remaining = stories.filter((_, i) => i !== index);
            if (remaining.length === 0) {
              navigation.goBack();
              return;
            }
            if (index >= remaining.length) {
              setIndex(remaining.length - 1);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.mediaContainer} {...panResponder.panHandlers}>
        <View style={styles.progressContainer}>
          {stories.map((_, i) => (
            <View key={i} style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  i < index && { width: '100%' },
                  i === index && {
                    width: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                  i > index && { width: '0%' },

                ]}
              />
            </View>
          ))}
        </View>
        {profile && (
          <View style={styles.userRow}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
            <Text style={styles.userName}>
              {profile.name || profile.username}
            </Text>
          </View>
        )}

        <Text style={styles.counter}>{`${index + 1}/${stories.length}`}</Text>
        {user && story?.userId === user.id && (
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
            <Text style={styles.deleteText}>X</Text>
          </TouchableOpacity>
        )}

        {story?.imageUri && (
          <Image
            source={{ uri: story.imageUri }}
            style={styles.media}
            resizeMode="contain"
          />
        )}
        {!story?.imageUri && story?.videoUri && (
          <Video
            source={{ uri: story.videoUri }}
            style={styles.media}
            resizeMode="contain"
            shouldPlay
          />
        )}
        <Pressable style={styles.leftZone} onPress={prev} />
        <Pressable style={styles.rightZone} onPress={next} />
      </View>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  mediaContainer: { width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center' },
  media: { width: '100%', height: '100%', borderRadius: 6 },
  leftZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '50%',
  },
  rightZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '50%',
  },
  counter: {
    position: 'absolute',
    top: 10,
    left: 10,
    color: colors.text,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  deleteBtn: { position: 'absolute', top: 10, right: 10, padding: 6, zIndex: 2 },
  deleteText: { color: colors.text, fontSize: 18 },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 4,
    margin: 8,
    zIndex: 2,
  },
  progressBarBackground: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginHorizontal: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.text,
  },
  userRow: {
    position: 'absolute',
    top: 20,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8 },
  avatarPlaceholder: { backgroundColor: '#555' },
  userName: { color: colors.text, fontWeight: 'bold' },

  closeButton: {
    position: 'absolute',
    bottom: '10%',

    alignSelf: 'center',
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 6,
    zIndex: 2,
  },
  closeText: { color: colors.text, fontSize: 18 },

});
