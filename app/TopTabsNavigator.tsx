import React, { useState, useRef, Suspense, useCallback } from 'react';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBar,
  MaterialTopTabBarProps,
} from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import {
  View,
  Text,
  Button,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  StatusBar,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';


import { useAuth } from '../AuthContext';
import { useNavigation } from '@react-navigation/native';
import HomeScreen, { HomeScreenRef } from './screens/HomeScreen';
import LoadingScreen from './components/LoadingScreen';

const FollowingFeedScreen = React.lazy(() => import('./screens/FollowingFeedScreen'));
import { supabase } from '../lib/supabase';
import { colors } from './styles/colors';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';


const Tab = createMaterialTopTabNavigator();
const TAB_BAR_HEIGHT = 48;
const HEADER_BOTTOM_PADDING = 0;
const BLUR_BACKGROUND_COLOR = 'rgba(29,21,43,0.6)';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const BOTTOM_NAV_HEIGHT = SCREEN_HEIGHT * 0.1;
const FAB_BOTTOM_OFFSET = (BOTTOM_NAV_HEIGHT + 10) * 0.75;

const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;


function HeaderTabBar(
  props: MaterialTopTabBarProps & {
    insetsTop: number;
<<<<<<< s6kyq1-codex/update-header-with-user-avatar-and-move-logout
=======

>>>>>>> main
    avatarUri?: string | null;
    onProfile: () => void;
    onSearch: () => void;
  },
) {
  const { insetsTop, avatarUri, onProfile, onSearch, ...barProps } = props;
<<<<<<< s6kyq1-codex/update-header-with-user-avatar-and-move-logout
=======

>>>>>>> main
  return (
    <BlurView
      intensity={25}
      tint="dark"
      style={[styles.headerBlur, { paddingTop: insetsTop + 10 }]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onProfile} style={styles.avatarButton}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <Ionicons name="person-circle-outline" size={40} color={colors.accent} />
          )}
        </TouchableOpacity>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity onPress={onSearch} style={styles.searchButton}>
          <Ionicons name="search" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>
<<<<<<< s6kyq1-codex/update-header-with-user-avatar-and-move-logout
=======

>>>>>>> main
      <MaterialTopTabBar
        {...barProps}
        style={[barProps.style, styles.blurredBar]}
      />
    </BlurView>
  );
}

export default function TopTabsNavigator() {
  const { profile, user, signOut, profileImageUri } = useAuth()!;
  

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const HEADER_CONTENT_HEIGHT = 70;
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;
  const HEADER_TOTAL_HEIGHT =
    headerHeight + HEADER_BOTTOM_PADDING + TAB_BAR_HEIGHT;



  const [modalVisible, setModalVisible] = useState(false);
  const [postText, setPostText] = useState('');
  const [modalText, setModalText] = useState('');
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [modalVideo, setModalVideo] = useState<string | null>(null);
  const homeScreenRef = useRef<HomeScreenRef>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setModalImage(uri);
      setModalVideo(null);
    }
  };

  const pickVideo = async () => {
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
      setModalVideo(uri);
      setModalImage(null);
    }
  };

  const handlePost = async () => {
    if (!postText.trim() || !user) return;

    await supabase.from('posts').insert([
      {
        content: postText,
        user_id: user.id,
        username: profile.name || profile.username,
      },
    ]);

    setPostText('');
    setModalVisible(false);
  };

  const handleModalPost = async () => {
    await homeScreenRef.current?.createPost(
      modalText,
      modalImage ?? undefined,
      modalVideo ?? undefined,
    );
    setModalText('');
    setModalImage(null);
    setModalVideo(null);
    setModalVisible(false);
  };

  const handleAddStory = () => {
    setModalVisible(false);
    navigation.navigate('CreateStory');
  };


  const ForYouScreen = useCallback(
    () => <HomeScreen ref={homeScreenRef} hideInput />,
    [],
  );

  const drawerAnim = useRef(new Animated.Value(0)).current;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  };

  const translateX = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, DRAWER_WIDTH],
  });
  const overlayOpacity = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] });
  const drawerTranslate = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={[]}
    >
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
        <Tab.Navigator
          tabBar={(props) => (
            <HeaderTabBar
              {...props}
              insetsTop={insets.top}
<<<<<<< s6kyq1-codex/update-header-with-user-avatar-and-move-logout
=======

>>>>>>> main
              avatarUri={profileImageUri ?? profile?.image_url ?? undefined}
              onProfile={openDrawer}
              onSearch={() => homeScreenRef.current?.openSearch()}
            />
          )}
          sceneContainerStyle={{ paddingTop: HEADER_TOTAL_HEIGHT }}

        screenOptions={{
          tabBarStyle: {
            backgroundColor: 'transparent',
            marginTop: 0,
          },
          tabBarLabelStyle: {
            color: colors.text,
            fontWeight: 'bold',
          },
          tabBarIndicatorStyle: {
            backgroundColor: colors.accent,
          },
          tabBarActiveTintColor: colors.accent,
        }}
      >
        <Tab.Screen name="For you" component={ForYouScreen} />
        <Tab.Screen name="Following">
          {() => (
            <Suspense fallback={<LoadingScreen />}>
              <FollowingFeedScreen />
            </Suspense>
          )}
        </Tab.Screen>
        </Tab.Navigator>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.fab}
        >
          <Text style={{ color: colors.text, fontSize: 24 }}>+</Text>
        </TouchableOpacity>

        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TextInput
                placeholder="What's on your mind?"
                style={styles.input}
                value={modalText}
                onChangeText={setModalText}
              />
              {modalImage && (
                <Image source={{ uri: modalImage }} style={styles.preview} />
              )}
              {!modalImage && modalVideo && (
                <Video
                  source={{ uri: modalVideo }}
                  style={styles.preview}
                  useNativeControls
                  isMuted
                  resizeMode="contain"
                />
              )}
              <View style={styles.buttonRow}>
                <Button title="Add Image" onPress={pickImage} />
                <Button title="Add Video" onPress={pickVideo} />
                <Button title="Add Story" onPress={handleAddStory} />
                <Button title="Post" onPress={handleModalPost} />
              </View>
              <Button title="Cancel" onPress={() => setModalVisible(false)} />
            </View>
          </View>
        </Modal>
      </Animated.View>

      {drawerOpen && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>
      )}

      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerTranslate }] }]}>
        <TouchableOpacity
          onPress={() => {
            closeDrawer();
            navigation.navigate('Profile');
          }}
        >

          <Text style={styles.menuItem}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            closeDrawer();
            navigation.navigate('DMList');
          }}
        >
          <Text style={styles.menuItem}>Direct Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            closeDrawer();
            signOut();
          }}
        >
          <Text style={styles.menuItem}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 8,
    width: '80%',
  },
  input: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    color: colors.text,
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
  fab: {
    position: 'absolute',
    bottom: FAB_BOTTOM_OFFSET,

    right: 20,
    backgroundColor: colors.accent,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: HEADER_BOTTOM_PADDING,
    backgroundColor: 'rgba(29,21,43,0.6)',
    zIndex: 20,
  },
  logo: {
    width: 120,
    height: 40,
    alignSelf: 'center',

    marginBottom: 5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: { position: 'absolute', right: 0, padding: 4 },
  avatarButton: { position: 'absolute', left: 0, padding: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
<<<<<<< s6kyq1-codex/update-header-with-user-avatar-and-move-logout
=======

>>>>>>> main


  blurredBar: {
    backgroundColor: 'transparent',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.background,
    paddingTop: 100,
    paddingHorizontal: 20,
    zIndex: 30,
  },
  menuItem: {
    color: colors.text,
    paddingVertical: 10,
    fontSize: 16,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 25,
  },
});
