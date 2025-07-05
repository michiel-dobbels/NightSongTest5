import React, { Suspense } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../app/styles/colors';
import NotificationBellIcon from '../app/components/NotificationBellIcon';
import { useNotifications } from '../lib/hooks/useNotifications';

import TopTabsNavigator from '../app/TopTabsNavigator';

import MarketScreen from './MarketScreen';
import VideoScreen from '../app/screens/VideoScreen';
import NotificationsScreen from '../app/screens/NotificationsScreen';

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
const CreateStoryScreen = React.lazy(() =>
  import('../app/screens/CreateStoryScreen'),
);
const StoryViewScreen = React.lazy(() =>
  import('../app/screens/StoryViewScreen'),
);
const DMListScreen = React.lazy(() => import('../app/screens/DMListScreen'));
const NewChatScreen = React.lazy(() => import('../app/screens/NewChatScreen'));
const DMThreadScreen = React.lazy(() => import('../app/screens/DMThreadScreen'));

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
        <Stack.Screen name="CreateStory" component={CreateStoryScreen} />
        <Stack.Screen name="StoryView" component={StoryViewScreen} />
        <Stack.Screen name="DMList" component={DMListScreen} />
        <Stack.Screen name="NewChat" component={NewChatScreen} />
        <Stack.Screen name="DMThread" component={DMThreadScreen} />

      </Stack.Navigator>
    </Suspense>
  );
}


export default function BottomTabsNavigator() {
  const { unreadCount } = useNotifications();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        safeAreaInsets: { bottom: 0 },
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 12, marginBottom: 4, color: colors.text },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          height: height * 0.1,
          width: '100%',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={25}
            tint="dark"
            style={{ flex: 1, backgroundColor: 'rgba(29,21,43,0.6)' }}
          />
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home-outline';
          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'Market') iconName = 'car-outline';
          else if (route.name === 'Video') iconName = 'play-circle-outline';
          if (route.name === 'Notifications')
            return (
              <NotificationBellIcon color={color} size={size} count={unreadCount} />
            );
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
