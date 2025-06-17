import React, { Suspense } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';
import { colors } from '../app/styles/colors';

import TopTabsNavigator from '../app/TopTabsNavigator';

import MarketScreen from './MarketScreen';
import VideoScreen from './VideoScreen';
import NotificationsScreen from './NotificationsScreen';

// Future search features will live in dedicated screens:
// - A post and reply search for forum content
// - A product search for the marketplace

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PostDetailScreen = React.lazy(() =>
  import('../app/screens/PostDetailScreen'),
);
const ReplyDetailScreen = React.lazy(() =>
  import('../app/screens/ReplyDetailScreen'),
);
const ProfileScreen = React.lazy(() => import('../app/screens/ProfileScreen'));
const UserProfileScreen = React.lazy(() =>
  import('../app/screens/UserProfileScreen'),
);
const OtherUserProfileScreen = React.lazy(() =>
  import('../app/screens/OtherUserProfileScreen'),
);
const FollowListScreen = React.lazy(() =>
  import('../app/screens/FollowListScreen'),
);
const { height } = Dimensions.get('window');

function HomeStackScreen() {
  return (
    <Suspense fallback={null}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="TopTabs" component={TopTabsNavigator} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} />
        <Stack.Screen name="ReplyDetail" component={ReplyDetailScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="OtherUserProfile" component={OtherUserProfileScreen} />
        <Stack.Screen name="FollowList" component={FollowListScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}


export default function BottomTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 12, marginBottom: 4, color: colors.text },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          height: height * 0.1,
          width: '100%',
          backgroundColor: 'rgba(44,44,84,0.9)',
          borderTopWidth: 0,
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home-outline';
          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'Market') iconName = 'car-outline';
          else if (route.name === 'Video') iconName = 'play-circle-outline';
          else if (route.name === 'Notifications') iconName = 'notifications-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackScreen} />

      <Tab.Screen name="Market" component={MarketScreen} />
      <Tab.Screen name="Video" component={VideoScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
    </Tab.Navigator>
  );
}
