import React, { useState, useRef } from 'react';
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
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useAuth } from '../AuthContext';
import HomeScreen, { HomeScreenRef } from './screens/HomeScreen';
import { supabase } from '../lib/supabase';
import { colors } from './styles/colors';


function FollowingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#1d152b', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white' }}>Following Content</Text>
    </View>
  );
}

const Tab = createMaterialTopTabNavigator();
const TAB_BAR_HEIGHT = 48;
const HEADER_BOTTOM_PADDING = 0;
const BLUR_BACKGROUND_COLOR = 'rgba(29,21,43,0.6)';


function HeaderTabBar(
  props: MaterialTopTabBarProps & {
    insetsTop: number;
    welcomeText: string;
    signOut: () => void;
  },
) {
  const { insetsTop, welcomeText, signOut, ...barProps } = props;
  return (
    <BlurView
      intensity={50}
      tint="dark"
      style={[styles.headerBlur, { paddingTop: insetsTop + 10 }]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Text style={{ color: 'white', textAlign: 'center' }}>{welcomeText}</Text>
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <Button title="Logout" onPress={signOut} />
      </View>
      <MaterialTopTabBar
        {...barProps}
        style={[barProps.style, styles.blurredBar]}
      />
    </BlurView>
  );
}

export default function TopTabsNavigator() {
  const { profile, user, signOut } = useAuth() as any;
  const insets = useSafeAreaInsets();
  const HEADER_CONTENT_HEIGHT = 70;
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;
  const HEADER_TOTAL_HEIGHT =
    headerHeight + HEADER_BOTTOM_PADDING + TAB_BAR_HEIGHT;



  const [modalVisible, setModalVisible] = useState(false);
  const [postText, setPostText] = useState('');
  const [modalText, setModalText] = useState('');
  const homeScreenRef = useRef<HomeScreenRef>(null);

  const handlePost = async () => {
    if (!postText.trim() || !user) return;

    await supabase.from('posts').insert([
      {
        content: postText,
        user_id: user.id,
        username: profile.display_name || profile.username,
      },
    ]);

    setPostText('');
    setModalVisible(false);
  };

  const handleModalPost = async () => {
    await homeScreenRef.current?.createPost(modalText);
    setModalText('');
    setModalVisible(false);
  };

  const displayName = profile?.display_name || profile?.username;
  const welcomeText = displayName
    ? `Welcome @${displayName}`
    : user?.email
    ? `Welcome ${user.email}`
    : 'Welcome';

  const ForYouScreen = () => <HomeScreen ref={homeScreenRef} hideInput />;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['bottom']}
    >

      <Tab.Navigator
        tabBar={(props) => (
          <HeaderTabBar
            {...props}
            insetsTop={insets.top}
            welcomeText={welcomeText}
            signOut={signOut}
          />
        )}
        sceneContainerStyle={{ paddingTop: HEADER_TOTAL_HEIGHT }}

        screenOptions={{
          tabBarStyle: {
            backgroundColor: 'transparent',
            marginTop: 0,
          },
          tabBarLabelStyle: {
            color: 'white',
            fontWeight: 'bold',
          },
          tabBarIndicatorStyle: {
            backgroundColor: '#7814db',
          },
        }}
      >
        <Tab.Screen name="For you" component={ForYouScreen} />
        <Tab.Screen name="Following" component={FollowingScreen} />
      </Tab.Navigator>

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.fab}
      >
        <Text style={{ color: 'white', fontSize: 24 }}>+</Text>
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
            <Button title="Post" onPress={handleModalPost} />
            <Button title="Cancel" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#1d152b',
    padding: 20,
    borderRadius: 8,
    width: '80%',
  },
  input: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#7814db',
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

  blurredBar: {
    backgroundColor: 'transparent',
  },
});
