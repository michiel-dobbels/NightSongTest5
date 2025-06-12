import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';

import HomeScreen from './HomeScreen';
import SearchScreen from './SearchScreen';
import MarketScreen from './MarketScreen';
import VideoScreen from './VideoScreen';
import NotificationsScreen from './NotificationsScreen';

const Tab = createBottomTabNavigator();
const { height } = Dimensions.get('window');

export default function BottomTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 12, marginBottom: 4 },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          height: height * 0.1,
          width: '100%',
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderTopWidth: 0,
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home-outline';
          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'Search') iconName = 'search-outline';
          else if (route.name === 'Market') iconName = 'car-outline';
          else if (route.name === 'Video') iconName = 'play-circle-outline';
          else if (route.name === 'Notifications') iconName = 'notifications-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Market" component={MarketScreen} />
      <Tab.Screen name="Video" component={VideoScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
    </Tab.Navigator>
  );
}
