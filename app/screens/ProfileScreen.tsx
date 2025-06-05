import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';


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
    const { user } = useAuth() as any;

    type Post = { id: string; content: string };

    const [posts, setPosts] = useState<Post[]>([]);

    useEffect(() => {
      if (!user) return;
      const load = async () => {
        const { data } = await supabase
          .from('posts')
          .select('id, content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (data) setPosts(data as Post[]);
      };
      load();
    }, [user]);

    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Text style={{ color: 'white', paddingVertical: 8 }}>{item.content}</Text>
          )}
        />
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
