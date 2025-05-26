import React, { useState, useRef } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import {
  View,
  Text,
  Button,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../AuthContext';
import HomeScreen, { HomeScreenRef } from './screens/HomeScreen';

function FollowingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#1d152b', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white' }}>Following Content</Text>
    </View>
  );
}

const Tab = createMaterialTopTabNavigator();

export default function TopTabsNavigator() {
  const { profile, user, signOut } = useAuth() as any;
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1d152b' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1d152b" />
      <Text style={{ color: 'white', textAlign: 'center', marginTop: 10 }}>{welcomeText}</Text>
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <Button title="Logout" onPress={signOut} />
      </View>

      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#1d152b',
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
});
