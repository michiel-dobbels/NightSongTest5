import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthPage from './AuthPage';
import TopTabsNavigator from './app/TopTabsNavigator';
import PostDetailScreen from './app/screens/PostDetailScreen';
import ReplyDetailScreen from './app/screens/ReplyDetailScreen';
import ProfileScreen from './app/screens/ProfileScreen';
import UserProfileScreen from './app/screens/UserProfileScreen';
import FollowListScreen from './app/screens/FollowListScreen';
import { useAuth } from './AuthContext';

const Stack = createNativeStackNavigator();

export default function Navigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Tabs" component={TopTabsNavigator} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} />
          <Stack.Screen name="ReplyDetail" component={ReplyDetailScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="FollowList" component={FollowListScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthPage} />
      )}
    </Stack.Navigator>
  );
}
