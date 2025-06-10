import React, { Suspense } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthPage from './AuthPage';
import TopTabsNavigator from './app/TopTabsNavigator';
import LoadingScreen from './app/components/LoadingScreen';

const PostDetailScreen = React.lazy(() => import('./app/screens/PostDetailScreen'));
const ReplyDetailScreen = React.lazy(() => import('./app/screens/ReplyDetailScreen'));
const ProfileScreen = React.lazy(() => import('./app/screens/ProfileScreen'));
const UserProfileScreen = React.lazy(() => import('./app/screens/UserProfileScreen'));
const OtherUserProfileScreen = React.lazy(() => import('./app/screens/OtherUserProfileScreen'));
const FollowListScreen = React.lazy(() => import('./app/screens/FollowListScreen'));
import { useAuth } from './AuthContext';

const Stack = createNativeStackNavigator();

export default function Navigator() {
  const { user, loading } = useAuth()!;

  if (loading) return null;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Stack.Navigator screenOptions={{ headerShown: false, detachInactiveScreens: false }}>
      {user ? (
        <>
          <Stack.Screen name="Tabs" component={TopTabsNavigator} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} />
          <Stack.Screen name="ReplyDetail" component={ReplyDetailScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="OtherUserProfile" component={OtherUserProfileScreen} />
          <Stack.Screen name="FollowList" component={FollowListScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthPage} />
      )}
      </Stack.Navigator>
    </Suspense>
  );
}
