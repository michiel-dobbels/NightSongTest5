import React, { useState, useRef, useEffect } from 'react';

import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import useLike from '../hooks/useLike';
import { Post } from './PostCard';

interface Props {
  post: Post;
  avatarUri?: string;
  isActive: boolean;
}

export default function MediaPostCard({ post, avatarUri, isActive }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const { likeCount, liked, toggleLike } = useLike(post.id);
  const username = post.profiles?.username || post.username || 'unknown';

  const media = post.video_url || post.image_url;
  const { width } = Dimensions.get('window');
  const height = width * 1.2;
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (!isActive) {
      videoRef.current?.setPositionAsync(0);
    }
  }, [isActive]);


  return (
    <View style={[styles.container, { height }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={StyleSheet.absoluteFill}
        onPress={() => setModalVisible(true)}
      >
        {post.video_url ? (
          <Video
            ref={videoRef}
            source={{ uri: post.video_url }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay={isActive}

          />
        ) : (
          <Image
            source={{ uri: post.image_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>
      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "transparent"]}
        style={styles.topGradient}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)"]}
        style={styles.bottomGradient}
      />
      <View style={styles.topLeft} pointerEvents="box-none">
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]} />
        )}
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.username}>@{username}</Text>
          {post.content ? (
            <Text style={styles.caption}>{post.content}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.bottomLeft} pointerEvents="box-none">
        <Ionicons
          name="heart"
          size={16}
          color="white"
          style={{ marginRight: 4 }}
        />
        <Text style={styles.count}>{likeCount}</Text>
        <Ionicons
          name="chatbubble"
          size={16}
          color="white"
          style={{ marginLeft: 12, marginRight: 4 }}
        />
        <Text style={styles.count}>{post.reply_count ?? 0}</Text>
      </View>
      <TouchableOpacity
        style={styles.bottomRight}
        onPress={() => toggleLike()}
      >
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={28}
          color="white"
        />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent>
        <TouchableOpacity
          style={styles.modalContainer}
          onPress={() => setModalVisible(false)}
        >
          {post.video_url ? (
            <Video
              source={{ uri: post.video_url }}
              style={styles.modalMedia}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay

            />
          ) : (
            <Image
              source={{ uri: post.image_url }}
              style={styles.modalMedia}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#000',
    overflow: 'hidden',
    borderRadius: 12,

  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  topLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  placeholder: {
    backgroundColor: '#555',
  },
  username: {
    color: 'white',
    fontWeight: 'bold',
  },
  caption: {
    color: 'white',
    marginTop: 2,
    maxWidth: Dimensions.get('window').width - 100,
  },
  bottomLeft: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  count: { color: 'white', fontSize: 14 },
  bottomRight: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMedia: {
    width: '100%',
    height: '100%',
  },
});
