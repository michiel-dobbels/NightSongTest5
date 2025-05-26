import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import React, { useState } from 'react';
import { View, Text, Button, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView, StatusBar } from 'react-native';
import { useAuth } from '../AuthContext';
import HomeScreen from './screens/HomeScreen';

function ForYouScreen() {
  return <HomeScreen />;
}

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

  const displayName = profile?.display_name || profile?.username;

  // Determine if we're still loading the profile or user
  const welcomeText = displayName
    ? `Welcome @${displayName}`
    : user?.email
    ? `Welcome ${user.email}`
    : 'Welcome';


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1d152b' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1d152b" />
      <Text style={{ color: 'white', textAlign: 'center', marginTop: 10 }}>
        {welcomeText}
      </Text>
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <Button title="Logout" onPress={signOut} />
      </View>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#1d152b',
            marginTop: 20,
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
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <View
            style={{
              backgroundColor: '#1d152b',
              padding: 20,
              borderRadius: 10,
              width: '80%',
              alignItems: 'center',
            }}
          >
            <Button title="Cancel" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: '#7814db',
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontSize: 24 }}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
